import { ApiManagementClient } from "@azure/arm-apimanagement";
import { pipe } from "fp-ts/lib/function";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import { Context } from "@azure/functions";
import knex from "knex";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { withJsonInput } from "../utils/misc";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import { ClaimSubscriptionItem } from "./type";

/*
 * We need to generate a valid SQL string to get all subscription owned by a sourceId and belongs to an Organization Fiscal Code where the status is not completed
 */
export const selectSubscriptionsNotCompletedSql = (
  dbConfig: IDecodableConfigPostgreSQL
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString,
  status: SubscriptionStatus
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select("subscriptionId")
    .from(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .and.where({ sourceId })
    .andWhereNot({ status })
    .toQuery() as NonEmptyString;

/*
 * The function gets all subscriptions available to migrate for the sourceId and organization fiscal code received from the queue message item
 */
export const getAllSubscriptionsAvailableToMigrate = (
  _config: IConfig,
  _pool: Pool
) => (
  _organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<unknown, unknown> =>
  pipe(TE.throwError("Need to update Subscription Status on Database"));

/*
 * We need to retrieve target ID in full path from APIM needed to create the message queue for claim a single subscription
 */
export const getTargetIdFromAPIM = (
  _config: IDecodableConfigAPIM,
  _apimClient: ApiManagementClient
) => (
  _organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<unknown, unknown> => pipe(TE.throwError("To Be implemented"));

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
 * Receive a message and dispatch inside a Queue
 */
export const dispatchMigrationJobToQueue = (_context: Context) => (
  _message: string
): void => void 0;

export const createHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient,
  _pool: Pool
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(async (_context, _item): Promise<void> => void 0);
