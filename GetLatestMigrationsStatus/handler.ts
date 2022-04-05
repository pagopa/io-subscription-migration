import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import knex from "knex";
import { MigrationsStatus } from "../generated/definitions/MigrationsStatus";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";

type Handler = () => Promise<
  | IResponseSuccessJson<{ readonly data: MigrationsStatus }>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

export const createSqlStatus = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  statusToExclude: SubscriptionStatus
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .distinct(["t.sourceEmail", "t.status"])
    .from(`${dbConfig.DB_TABLE} as t`)
    .join(
      knex({
        client: "pg"
      })
        .withSchema(dbConfig.DB_SCHEMA)
        .table(dbConfig.DB_TABLE)
        .select(["sourceEmail"])
        .max("updateAt as latestOp")
        .from(dbConfig.DB_TABLE)
        .where({ organizationFiscalCode })
        .andWhereNot({ status: statusToExclude })
        .groupBy("sourceEmail")
        .as("x"),
      function() {
        // eslint-disable-next-line no-invalid-this
        this.on("x.sourceEmail", "=", "t.sourceEmail").andOn(
          "latestOp",
          "=",
          "t.updateAt"
        );
      }
    )
    .as("t")
    .toQuery() as NonEmptyString;

export const createHandler = (): Handler => (): ReturnType<Handler> =>
  pipe(
    TE.throwError<
      string,
      IResponseSuccessJson<{ readonly data: MigrationsStatus }>
    >("To be Implementend"),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();

export const getLatestMigrationsHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient
): express.RequestHandler => {
  const handler = createHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
