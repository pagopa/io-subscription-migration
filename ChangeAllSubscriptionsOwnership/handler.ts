import { ApiManagementClient } from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import * as t from "io-ts";
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
  toPostgreSQLErrorMessage,
  toError as domainErrorToError
} from "../models/DomainErrors";
import { queryDataTable } from "../utils/db";
import { ApimOrganizationUserResponse } from "../models/DomainApimResponse";
import { MigrationsByOrganization } from "../utils/query";
import { ClaimOrganizationSubscriptions, ClaimSubscriptionItem } from "./type";

export const SubscriptionResultRow = t.interface({
  subscriptionId: NonEmptyString
});
export type SubscriptionResultRow = t.TypeOf<typeof SubscriptionResultRow>;

export const SubscriptionResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(SubscriptionResultRow)
});
export type SubscriptionResultSet = t.TypeOf<typeof SubscriptionResultSet>;

/*
 * We need to generate a valid SQL string to get all subscription owned by a sourceId and belongs to an Organization Fiscal Code where the status is not completed
 */
export const createSelectSubscriptions = (
  dbConfig: IDecodableConfigPostgreSQL
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString,
  statusToExclude: SubscriptionStatus
): NonEmptyString =>
  MigrationsByOrganization(dbConfig, organizationFiscalCode)
    .select("subscriptionId")
    .and.where({ sourceId })
    .andWhereNot({ status: statusToExclude })
    .toQuery() as NonEmptyString;

/*
 * The function gets all subscriptions available to migrate for the sourceId and organization fiscal code received from the queue message item
 */
export const getAllSubscriptionsAvailableToMigrate = (
  config: IConfig,
  pool: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): TE.TaskEither<IDbError, SubscriptionResultSet> =>
  pipe(
    createSelectSubscriptions(config)(
      organizationFiscalCode,
      sourceId,
      SubscriptionStatus.COMPLETED
    ),
    sql => queryDataTable(pool, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );
/*
 * We need to retrieve target ID in full path from APIM needed to create the message queue for claim a single subscription
 */
export const getTargetIdFromAPIM = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient
) => (
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IApimUserError, ApimOrganizationUserResponse> =>
  pipe(
    TE.tryCatch(
      async () => {
        const resArray = [];
        // eslint-disable-next-line functional/no-let,prefer-const
        for await (let item of apimClient.user.listByService(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME,
          {
            filter: `note eq '${organizationFiscalCode}'`
          }
        )) {
          // eslint-disable-next-line functional/immutable-data
          resArray.push(item);
        }
        return resArray;
      },
      () =>
        toApimUserError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.filterOrElse(
      results => results.length > 0,
      () => toApimUserError("No Organization account found.")
    ),
    TE.chain(([organizationTarget]) =>
      pipe(
        organizationTarget,
        ApimOrganizationUserResponse.decode,
        E.mapLeft(() => toApimUserError("Account decode error.")),
        TE.fromEither
      )
    )
  );

/*
 * Create a structure message to be inserted inside Queue
 */
export const subscriptionMessageToQueue = (
  subscriptionId: NonEmptyString,
  targetId: NonEmptyString
): string =>
  pipe(
    { subscriptionId, targetId },
    ClaimSubscriptionItem.encode,
    JSON.stringify
  );

/*
 * Compose the list of messages to enqueue
 */
export const composeMessages = (
  subscriptionsId: ReadonlyArray<SubscriptionResultRow>,
  targetId: NonEmptyString
): ReadonlyArray<string> =>
  pipe(
    subscriptionsId,
    RA.map(row => subscriptionMessageToQueue(row.subscriptionId, targetId))
  );

export const createHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  pool: Pool
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    async (context, item): Promise<void> =>
      pipe(
        // Get the message Queue
        item,
        ClaimOrganizationSubscriptions.decode,
        TE.fromEither,
        TE.mapLeft(() => E.toError("Error on decode")),
        TE.chain(organizationSubscriptions =>
          pipe(
            // Retrieve all Subscriptions to migrate (not completed yet)
            getAllSubscriptionsAvailableToMigrate(config, pool)(
              organizationSubscriptions.organizationFiscalCode,
              organizationSubscriptions.sourceId
            ),
            TE.mapLeft(domainErrorToError),
            TE.map(data => ({
              organizationFiscalCode:
                organizationSubscriptions.organizationFiscalCode,
              rows: data.rows // A set of SubscriptionId from OrganizationFiscalCode-SourceId
            }))
          )
        ),
        TE.chain(data =>
          pipe(
            // Retrieve TargetId from APIM
            getTargetIdFromAPIM(
              config,
              apimClient
            )(data.organizationFiscalCode),
            TE.mapLeft(domainErrorToError),
            TE.map(apimUser => ({
              rows: data.rows,
              targetId: apimUser.id
            }))
          )
        ),
        TE.map(data =>
          pipe(
            composeMessages(data.rows, data.targetId),
            // eslint-disable-next-line functional/immutable-data
            messages => (context.bindings.migrateonesubscriptionjobs = messages)
          )
        ),
        TE.map(_ => void 0),
        TE.getOrElse(err => {
          context.log.error(
            `ChangeAllSubscriptionsOwnership|ERROR=${err.message}`
          );
          throw err;
        })
      )()
  );
