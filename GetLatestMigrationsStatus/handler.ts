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

/*
We get a resultSet with this fields for every delegate belongs to an Organization:
sourceId | sourceName | sourceSurname | sourceEmail | Initial | Processing | Failed | Completed

where the latest 4 fields are the sum for every subscriptions in the specific status
*/
export const createSqlStatus = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select([
      "sourceId",
      "sourceName",
      "sourceSurname",
      "sourceEmail",
      knex({
        client: "pg"
      }).raw(
        `sum(CASE WHEN "m"."status" = 'INITIAL' THEN 1 ELSE 0 END) as initial`
      ),
      knex({
        client: "pg"
      }).raw(
        `sum(CASE WHEN "m"."status" = 'PROCESSING' THEN 1 ELSE 0 END) as processing`
      ),
      knex({
        client: "pg"
      }).raw(
        `sum(CASE WHEN "m"."status" = 'FAILED' THEN 1 ELSE 0 END) as failed`
      ),
      knex({
        client: "pg"
      }).raw(
        `sum(CASE WHEN "m"."status" = 'COMPLETED' THEN 1 ELSE 0 END) as completed`
      )
    ])

    .from(`${dbConfig.DB_TABLE} as m`)
    .where({ organizationFiscalCode })
    .groupBy(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .toQuery() as NonEmptyString;

/*
We would retrieve all the operations for each delegates belongs to an Organization Fiscal Code
 */
export const getLatestMigrationByOrganizationFiscalCode = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IDbError, LatestMigrationResultSet> =>
  pipe(
    createSqlStatus(config)(organizationFiscalCode),
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
    TE.of,
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
    TE.chainW(data =>
      pipe(
        data,
        LatestMigrationResultSet.decode,
        TE.fromEither,
        TE.mapLeft(() => ResponseErrorInternal("Error on decode"))
      )
    ),
    TE.mapLeft(e =>
      ResponseErrorInternal(
        `${e.kind}: ${
          e.kind === "dberror"
            ? e.message
            : "Error on getLatestMigrationByOrganizationFiscalCode"
        }
          `
      )
    ),
    TE.chain(processResponseFromLatestMigrationResultSet),
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
