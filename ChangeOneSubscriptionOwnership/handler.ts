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
import { SubscriptionQueueItem } from "./types";

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
