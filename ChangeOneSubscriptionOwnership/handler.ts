import { ApiManagementClient } from "@azure/arm-apimanagement";
import { pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as TE from "fp-ts/lib/TaskEither";
import { Pool } from "pg";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { withJsonInput } from "../utils/misc";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";

export const updateSql = (_dbConfig: IDecodableConfigPostgreSQL) => (
  _subscriptionId: NonEmptyString,
  _status: SubscriptionStatus
): NonEmptyString => "Need to return a valid SQL" as NonEmptyString;

export const updateSubscriptionStatusToDatabase = (
  _apimClient: ApiManagementClient,
  _config: IConfig,
  _pool: Pool
) => (_updateQuery: NonEmptyString): TE.TaskEither<unknown, unknown> =>
  pipe(TE.throwError("Need to update Subscription Status on Database"));

export const updateApimSubscription = (
  _config: IDecodableConfigAPIM,
  _apimClient: ApiManagementClient,
  _subscriptionId: NonEmptyString,
  _targetId: NonEmptyString
): TE.TaskEither<unknown, unknown> => pipe(TE.throwError("To Be implemented"));

export const createHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(async (_context, _item): Promise<void> => void 0);
