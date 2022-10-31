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
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";
import knexBase from "knex";
import { Pool, QueryResult } from "pg";
import * as t from "io-ts";
import { Context } from "@azure/functions";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { LatestMigrationsResponse } from "../generated/definitions/LatestMigrationsResponse";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { queryDataTable } from "../utils/db";

// set Postgres as default db target for the query builder
const knex = knexBase({
  client: "pg"
});

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode
) => Promise<
  | IResponseSuccessJson<LatestMigrationsResponse>
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
  knex
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select([
      "sourceId",
      "sourceName",
      "sourceSurname",
      "sourceEmail",
      knex.raw(`max("m"."updateAt") as "lastUpdate"`),
      knex.raw(
        `sum(CASE WHEN "m"."status" = 'INITIAL' THEN 1 ELSE 0 END) as initial`
      ),
      knex.raw(
        `sum(CASE WHEN "m"."status" = 'PROCESSING' THEN 1 ELSE 0 END) as processing`
      ),
      knex.raw(
        `sum(CASE WHEN "m"."status" = 'FAILED' THEN 1 ELSE 0 END) as failed`
      ),
      knex.raw(
        `sum(CASE WHEN "m"."status" = 'COMPLETED' THEN 1 ELSE 0 END) as completed`
      )
    ])
    .from(`${dbConfig.DB_TABLE} as m`)
    .where({ organizationFiscalCode })
    // ignore subs that has never been visible, probably tests or drafts that aren't worth being migrated
    .and.where({ hasBeenVisibleOnce: true })
    // some subs have "deleted" in their name, we can skip them
    .and.not.whereILike("serviceName", "%deleted%")
    .groupBy(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .having(
      // consider only delegates for which at least one migration has started
      knex.raw(`sum(CASE WHEN "m"."status" <> 'INITIAL' THEN 1 ELSE 0 END) > 0`)
    )
    .orderBy("lastUpdate", "desc")
    .toQuery() as NonEmptyString;

/*
We would retrieve all the operations for each delegates belongs to an Organization Fiscal Code
 */
export const getLatestMigrationByOrganizationFiscalCode = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    createSqlStatus(config)(organizationFiscalCode),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

// format a db recordset into a struct as expected by the response specification
export const processResponseFromLatestMigrationResultSet = (
  resultSet: QueryResult
): E.Either<t.Errors, LatestMigrationsResponse> =>
  pipe(
    resultSet.rows,
    RA.map(row => ({
      delegate: {
        sourceEmail: row.sourceEmail,
        sourceId: row.sourceId,
        sourceName: row.sourceName,
        sourceSurname: row.sourceSurname
      },
      status: {
        completed: Number(row.completed),
        failed: Number(row.failed),
        initial: Number(row.initial),
        processing: Number(row.processing)
      }
    })),
    items => ({ items }),
    LatestMigrationsResponse.decode
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
    TE.mapLeft(e =>
      ResponseErrorInternal(`Failed to execute query on database: ${e.message}`)
    ),
    TE.mapLeft(_ => _),
    TE.chainW(
      flow(
        processResponseFromLatestMigrationResultSet,
        TE.fromEither,
        TE.mapLeft(err =>
          ResponseErrorInternal(
            `Failed decoding query data: ${readableReport(err)}`
          )
        )
      )
    ),
    TE.map(ResponseSuccessJson),
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
