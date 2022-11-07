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
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
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
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { queryDataTable } from "../utils/db";
import { MigrationsByDelegate } from "../utils/query";
import { MigrationsStatusByDelegateResponse } from "../generated/definitions/MigrationsStatusByDelegateResponse";

// set Postgres as default db target for the query builder
const knex = knexBase({
  client: "pg"
});

type Handler = (
  context: Context,
  delegateId: NonEmptyString
) => Promise<
  | IResponseSuccessJson<MigrationsStatusByDelegateResponse>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

/*
We get a resultSet with this fields for every Organization the Delagate owns/owned a subscrition
organizationFiscalCode | Initial | Processing | Failed | Completed

where the latest 4 fields are the sum for every subscriptions in the specific status
*/
export const createSqlStatus = (dbConfig: IDecodableConfigPostgreSQL) => (
  delegateId: string
): NonEmptyString =>
  MigrationsByDelegate(dbConfig, delegateId)
    .select([
      "organizationFiscalCode",
      knex.raw(`max("updateAt") as "lastUpdate"`),
      knex.raw(
        `sum(CASE WHEN "status" = 'INITIAL' THEN 1 ELSE 0 END) as initial`
      ),
      knex.raw(
        `sum(CASE WHEN "status" = 'PROCESSING' THEN 1 ELSE 0 END) as processing`
      ),
      knex.raw(
        `sum(CASE WHEN "status" = 'FAILED' THEN 1 ELSE 0 END) as failed`
      ),
      knex.raw(
        `sum(CASE WHEN "status" = 'COMPLETED' THEN 1 ELSE 0 END) as completed`
      )
    ])
    .groupBy(["organizationFiscalCode"])
    .orderBy("lastUpdate", "desc")
    .toQuery() as NonEmptyString;

/*
We would retrieve all the operations for each organization for which the delegate owns/owned at least one subscription
 */
export const getMigrationByDelegate = (config: IConfig, connect: Pool) => (
  delegateId: string
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    createSqlStatus(config)(delegateId),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

// format a db recordset into a struct as expected by the response specification
export const processResponseFromResultSet = (
  resultSet: QueryResult
): E.Either<t.Errors, MigrationsStatusByDelegateResponse> =>
  pipe(
    resultSet.rows,
    RA.map(row => ({
      lastUpdate: row.lastUpdate,
      organization: {
        fiscalCode: row.organizationFiscalCode
      },
      status: {
        completed: Number(row.completed),
        failed: Number(row.failed),
        initial: Number(row.initial),
        processing: Number(row.processing)
      }
    })),
    items => ({ items }),
    MigrationsStatusByDelegateResponse.decode
  );

export const createHandler = (config: IConfig, pool: Pool): Handler => async (
  _context,
  delegateId
): ReturnType<Handler> =>
  pipe(
    getMigrationByDelegate(config, pool)(delegateId),
    TE.mapLeft(e =>
      ResponseErrorInternal(`Failed to execute query on database: ${e.message}`)
    ),
    TE.chainW(
      flow(
        processResponseFromResultSet,
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

export const getHandler = (
  config: IConfig,
  client: Pool
): express.RequestHandler => {
  const handler = createHandler(config, client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
