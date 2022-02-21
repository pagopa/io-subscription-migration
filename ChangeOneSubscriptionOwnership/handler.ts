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
    async (_context, item): Promise<void> =>
      pipe(
        // Need to define a type for Queue Item
        TE.of(
          item as {
            readonly subscriptionId: NonEmptyString;
            readonly targetId: NonEmptyString;
          }
        ),
        // Todo: Refactor with a Queue Item and Decode it to check for the right value
        TE.chain(subscriptionMessage =>
          pipe(
            updateApimSubscription(config, apimClient)(
              subscriptionMessage.subscriptionId,
              subscriptionMessage.targetId
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
