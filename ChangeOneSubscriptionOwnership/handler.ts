import {
  ApiManagementClient,
  SubscriptionUpdateResponse
} from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import knex from "knex";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { withJsonInput } from "../utils/misc";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import {
  IApimUserError,
  IDbError,
  toApimUserError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { queryDataTable, ResultSet } from "../utils/db";
import {
  trackFailedMigrationServiceDocument,
  trackMigratedServiceDocument
} from "../utils/tracking";
import { initTelemetryClient } from "../utils/appinsight";
import { ClaimSubscriptionItem } from "./types";

/*
 * The purpose of this function is to generate a valid Update Query Statement
 */
export const generateUpdateSQL = (dbConfig: IDecodableConfigPostgreSQL) => (
  subscriptionId: NonEmptyString,
  status: SubscriptionStatus
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .update("status", status)
    .from(dbConfig.DB_TABLE)
    .where({ subscriptionId })
    .toQuery() as NonEmptyString;

/*
 * The purpose of this function is to update a single subscription inside DB from a valid Update Query Statement
 */
export const updateSubscriptionStatusToDatabase = (
  config: IConfig,
  connect: Pool
) => (
  subscriptionId: NonEmptyString,
  status: SubscriptionStatus
): TE.TaskEither<IDbError, ResultSet> =>
  pipe(
    generateUpdateSQL(config)(subscriptionId, status),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

/*
 * The function purpose is to update the subscription owner id to APIM
 * We need the complete target id PATH: /subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/XXXXXXX/providers/Microsoft.ApiManagement/service/XXXXXXX/users/users/XXXXXXXXXXXXXXXXXXXXXXXXXX
 */
export const updateApimSubscription = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient
) => (
  subscriptionId: NonEmptyString,
  targetId: NonEmptyString
): TE.TaskEither<IApimUserError, SubscriptionUpdateResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apimClient.subscription.update(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME,
          subscriptionId,
          "*",
          {
            ownerId: targetId
          }
        ),
      e => toApimUserError((e as Error).message)
    ),
    TE.filterOrElse(
      // Check if ownerId is available and it's the same of targetId
      res => res.ownerId !== undefined && res.ownerId === targetId,
      () => toApimUserError("Error on update")
    )
  );

export const createHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  pool: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    async (context, subscriptionMessage): Promise<void> =>
      pipe(
        subscriptionMessage,
        ClaimSubscriptionItem.decode,
        TE.fromEither,
        TE.mapLeft(() => {
          context.log.error(
            `${context.executionContext.functionName}:Error on decode subscription message`
          );
          return E.toError("Error on decode");
        }),
        // Update subscription on APIM
        TE.chain(subscriptionToMigrate =>
          pipe(
            updateApimSubscription(config, apimClient)(
              subscriptionToMigrate.subscriptionId,
              subscriptionToMigrate.targetId
            ),
            TE.mapLeft(() => {
              context.log.error(
                `${context.executionContext.functionName}: Error on update APIM subscription`
              );
              trackFailedMigrationServiceDocument(telemetryClient)(
                subscriptionToMigrate.subscriptionId,
                subscriptionToMigrate.targetId
              );
              return E.toError("Error on update APIM subscription");
            }),
            TE.map(() => subscriptionToMigrate) // Return subscriptionToMigrate
          )
        ),
        // Update subscription status on Database
        TE.chain(subscriptionToMigrate =>
          pipe(
            updateSubscriptionStatusToDatabase(config, pool)(
              subscriptionToMigrate.subscriptionId,
              SubscriptionStatus.COMPLETED
            ),
            TE.map(() => subscriptionToMigrate), // Return subscriptionToMigrate
            TE.mapLeft(E.toError)
          )
        ),
        // We don't want to return anything
        TE.map(subscriptionMigrated => {
          trackMigratedServiceDocument(telemetryClient)(
            subscriptionMigrated.subscriptionId,
            subscriptionMigrated.targetId
          );
          context.log(
            `${context.executionContext.functionName}: Update subscription ${subscriptionMigrated.subscriptionId} for ${subscriptionMigrated.targetId} done`
          );
          return void 0;
        }),
        // If we get an error we want the handler fail
        TE.getOrElse(err => {
          throw err;
        })
      )()
  );
