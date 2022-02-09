/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable arrow-body-style */
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Context } from "@azure/functions";
import { Pool } from "pg";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { queryDataTable } from "../utils/dbconnector";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import { ClaimProcedureStatus } from "../generated/definitions/ClaimProcedureStatus";

export const QueryStatusResult = t.interface({
  count: NumberFromString,
  status: t.string
});
export type QueryStatusResult = t.TypeOf<typeof QueryStatusResult>;

export const Result = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(QueryStatusResult)
});
export type Result = t.TypeOf<typeof Result>;

type GetStatusHandler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_id: NonEmptyString
) => Promise<
  IResponseSuccessJson<ClaimProcedureStatus> | IResponseErrorInternal
>;

export const createSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): NonEmptyString =>
  `SELECT status, count(status)
	FROM "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}"
	WHERE "organizationFiscalCode" = '${organizationFiscalCode}' and "sourceId" = '${sourceId}'
	GROUP BY status` as NonEmptyString;

const GetStatusHandler = (
  config: IConfig,
  pool: Pool
): GetStatusHandler => async (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_id: NonEmptyString
): Promise<
  IResponseSuccessJson<ClaimProcedureStatus> | IResponseErrorInternal
> => {
  context.log(`Starting Status for: ${organizationFiscalCode} ${delegate_id}`);
  const connect = await pool.connect();
  return pipe(
    createSql(config)(organizationFiscalCode, delegate_id),
    sql => queryDataTable(connect, sql),

    TE.map(Result.decode),
    TE.chainW(TE.fromEither),
    TE.mapLeft(err => ResponseErrorInternal(err.toLocaleString())),
    TE.map(({ rows }) => {
      return {
        completed:
          rows.find(row => row.status.toLowerCase() === "completed")?.count ??
          0,
        failed:
          rows.find(row => row.status.toLowerCase() === "failed")?.count ?? 0,
        initial:
          rows.find(row => row.status.toLowerCase() === "initial")?.count ?? 0,
        processing:
          rows.find(row => row.status.toLowerCase() === "processing")?.count ??
          0
      };
    }),
    TE.map(data => ResponseSuccessJson(data)),
    TE.toUnion
  )();
};

export const Handler = (
  config: IConfig,
  client: Pool
) => (): express.RequestHandler => {
  const handler = GetStatusHandler(config, client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
