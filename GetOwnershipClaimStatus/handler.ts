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
import * as t from "io-ts";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { DatabaseError, Pool } from "pg";
import { ClaimProcedureStatus } from "../generated/definitions/ClaimProcedureStatus";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { queryDataTable } from "../utils/db";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";

export const ResultRow = t.interface({
  count: NumberFromString,
  status: t.string
});
export type ResultRow = t.TypeOf<typeof ResultRow>;

export const ResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(ResultRow)
});
export type ResultSet = t.TypeOf<typeof ResultSet>;

export const createSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): NonEmptyString =>
  `SELECT status, count(status)
	FROM "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}"
	WHERE "organizationFiscalCode" = '${organizationFiscalCode}' and "sourceId" = '${sourceId}'
	GROUP BY status` as NonEmptyString;

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
    TE.mapLeft(e =>
      flow(
        toPostgreSQLErrorMessage,
        toPostgreSQLError
      )((e as unknown) as DatabaseError)
    )
  );

export const processResponseFromResultSet = (
  resultSet: ResultSet
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  IResponseSuccessJson<{ readonly data: ClaimProcedureStatus }>
> =>
  pipe(
    resultSet,
    TE.of,
    TE.chainW(flow(ResultSet.decode, TE.fromEither)),
    TE.mapLeft(() => ResponseErrorInternal("Errore on decode")),

    TE.map(({ rows }) => ({
      completed:
        rows.find(row => row.status.toLowerCase() === "completed")?.count ?? 0,
      failed:
        rows.find(row => row.status.toLowerCase() === "failed")?.count ?? 0,
      initial:
        rows.find(row => row.status.toLowerCase() === "initial")?.count ?? 0,
      processing:
        rows.find(row => row.status.toLowerCase() === "processing")?.count ?? 0
    })),
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
  context,
  organizationFiscalCode,
  sourceId
): ReturnType<Handler> => {
  context.log(`Starting Status for: ${organizationFiscalCode} ${sourceId}`);
  return pipe(
    getStatusByOrganizationAndSourceId(config, pool)(
      organizationFiscalCode,
      sourceId
    ),
    TE.mapLeft(errors => ResponseErrorInternal(E.toError(errors).message)),
    TE.chainW(processResponseFromResultSet),
    TE.toUnion
  )();
};

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
