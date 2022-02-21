import { ApiManagementClient } from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
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
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { queryDataTable, ResultSet } from "../utils/db";
import { SubscriptionQueueItem } from "./types";

/*
 * The purpose of this function is to generate a valid Update Query Statement
 */
export const getUpdateSubscriptionSql = (
  dbConfig: IDecodableConfigPostgreSQL
) => (
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
) => (subscriptionId: NonEmptyString): TE.TaskEither<IDbError, ResultSet> =>
  pipe(
    getUpdateSubscriptionSql(config)(
      subscriptionId,
      SubscriptionStatus.COMPLETED
    ),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const updateApimSubscription = (
  _config: IDecodableConfigAPIM,
  _apimClient: ApiManagementClient
) => (
  _subscriptionId: NonEmptyString,
  _targetId: NonEmptyString
): TE.TaskEither<unknown, unknown> => pipe(TE.throwError("To Be implemented"));

export const createHandler = (
  config: IConfig,
  apimClient: ApiManagementClient
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    async (_context, subscriptionMessage): Promise<void> =>
      pipe(
        subscriptionMessage,
        SubscriptionQueueItem.decode,
        TE.fromEither,
        TE.chain(subscriptionToMigrate =>
          pipe(
            updateApimSubscription(config, apimClient)(
              subscriptionToMigrate.subscriptionId,
              subscriptionToMigrate.targetId
            )
            // Todo: After update Apim, update Database
          )
        ),
        TE.map(_ => void 0),
        TE.getOrElse(err => {
          throw err;
        })
      )()
  );
