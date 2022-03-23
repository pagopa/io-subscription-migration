import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { Context } from "@azure/functions";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { Pool } from "pg";
import knex from "knex";
import { ClaimProcedureStatus } from "../generated/definitions/ClaimProcedureStatus";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { queryDataTable, ResultRow, ResultSet } from "../utils/db";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";

export const enum SubscriptionStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  INITAL = "INITIAL",
  PROCESSING = "PROCESSING"
}

export const createSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select("status")
    .count("status")
    .from(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .and.where({ sourceId })
    .groupBy("status")
    .toQuery() as NonEmptyString;

/*
 * Query the database and return a ResultSet or an Error of type IDbError
 */
export const getStatusByOrganizationAndSourceId = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): TE.TaskEither<IDbError, ResultSet> =>
  pipe(
    createSql(config)(organizationFiscalCode, sourceId),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

/*
 * The function needs to produce a valid Response to the caller.
 * ResultSet contains an array of rows grouped by status and a counter and we need to map to an Object
 */
export const processResponseFromResultSet = (
  resultSet: ResultSet
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  IResponseSuccessJson<{ readonly data: ClaimProcedureStatus }>
> =>
  pipe(
    resultSet,
    ResultSet.decode,
    TE.fromEither,
    TE.mapLeft(() => ResponseErrorInternal("Error on decode")),
    TE.map(({ rows }) =>
      rows.reduce(
        (acc: ClaimProcedureStatus, cur: ResultRow) => ({
          ...acc,
          [cur.status]: cur.count
        }),
        {} as ClaimProcedureStatus
      )
    ),
    TE.map(data => ResponseSuccessJson({ data }))
  );

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
) => Promise<
  | IResponseSuccessJson<{ readonly data: ClaimProcedureStatus }>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

const createHandler = (config: IConfig, pool: Pool): Handler => async (
  _context,
  organizationFiscalCode,
  sourceId
): ReturnType<Handler> =>
  pipe(
    getStatusByOrganizationAndSourceId(config, pool)(
      organizationFiscalCode,
      sourceId
    ),
    TE.mapLeft(flow(E.toError, e => ResponseErrorInternal(e.message))),
    TE.chainW(processResponseFromResultSet),
    TE.toUnion
  )();

const ClaimProcedureStatusHandler = (
  config: IConfig,
  client: Pool
) => (): express.RequestHandler => {
  const handler = createHandler(config, client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};

export default ClaimProcedureStatusHandler;
