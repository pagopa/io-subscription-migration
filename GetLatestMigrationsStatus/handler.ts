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
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import { flow, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import knex from "knex";
import { Pool } from "pg";
import * as t from "io-ts";
import { Context } from "@azure/functions";
import { MigrationsStatus } from "../generated/definitions/MigrationsStatus";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { queryDataTable } from "../utils/db";

export const LatestMigrationResultSet = t.interface({
  rowCount: t.number,
  rows: MigrationsStatus
});
export type LatestMigrationResultSet = t.TypeOf<
  typeof LatestMigrationResultSet
>;

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode
) => Promise<
  | IResponseSuccessJson<MigrationsStatus>
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

export const getLatestMigrationByOrganizationFiscalCode = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IDbError, LatestMigrationResultSet> =>
  pipe(
    createSqlStatus(config)(organizationFiscalCode, SubscriptionStatus.INITAL),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const processResponseFromLatestMigrationResultSet = (
  resultSet: LatestMigrationResultSet
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  IResponseSuccessJson<MigrationsStatus>
> =>
  pipe(
    resultSet,
    LatestMigrationResultSet.decode,
    TE.fromEither,
    TE.mapLeft(() => ResponseErrorInternal("Error on decode")),
    TE.map(data => ResponseSuccessJson(data.rows))
  );

export const createHandler = (config: IConfig, pool: Pool): Handler => async (
  _context,
  organizationFiscalCode
): ReturnType<Handler> =>
  pipe(
    getLatestMigrationByOrganizationFiscalCode(
      config,
      pool
    )(organizationFiscalCode),
    TE.mapLeft(error =>
      pipe(error, e =>
        ResponseErrorInternal(
          `${e.kind}: ${e.message ||
            "Error on getLatestMigrationByOrganizationFiscalCode"}`
        )
      )
    ),
    TE.chainW(processResponseFromLatestMigrationResultSet),
    TE.toUnion
  )();

export const getLatestMigrationsHandler = (
  config: IConfig,
  client: Pool
): express.RequestHandler => {
  const handler = createHandler(config, client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
