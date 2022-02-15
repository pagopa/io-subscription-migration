import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import { flow, pipe } from "fp-ts/lib/function";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/lib/TaskEither";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import knex from "knex";
import { Pool } from "pg";
import * as t from "io-ts";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import { Context } from "@azure/functions";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";
import { OrganizationDelegates } from "../generated/definitions/OrganizationDelegates";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { queryDataTable } from "../utils/db";

export const DelegateResultRow = t.interface({
  sourceEmail: EmailString,
  sourceId: t.string,
  sourceName: t.string,
  sourceSurname: t.string,
  subscriptionCounter: NumberFromString
});
export type DelegateResultRow = t.TypeOf<typeof DelegateResultRow>;

export const DelegatesResultSet = t.interface({
  rowCount: t.number,
  rows: t.readonlyArray(DelegateResultRow)
});
export type DelegatesResultSet = t.TypeOf<typeof DelegatesResultSet>;

type GetDelegatesByOrganizationResponseHandler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode
) => Promise<
  | IResponseSuccessJson<{ readonly data: OrganizationDelegates }>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

export const createSqlDelegates = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .count("subscriptionId as subscriptionCounter")
    .from(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .groupBy(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .toQuery() as NonEmptyString;

export const getDelegatesByOrganizationFiscalCode = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode
): TE.TaskEither<IDbError, DelegatesResultSet> =>
  pipe(
    createSqlDelegates(config)(organizationFiscalCode),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const processResponseFromDelegatesResultSet = (
  resultSet: DelegatesResultSet
): TE.TaskEither<
  IResponseErrorInternal | IResponseErrorNotFound,
  IResponseSuccessJson<{ readonly data: OrganizationDelegates }>
> =>
  pipe(
    resultSet,
    DelegatesResultSet.decode,
    TE.fromEither,
    TE.mapLeft(() => ResponseErrorInternal("Error on decode")),
    TE.map(data => ResponseSuccessJson({ data: data.rows }))
  );

const createHandler = (
  config: IConfig,
  pool: Pool
): GetDelegatesByOrganizationResponseHandler => async (
  _context,
  organizationFiscalCode
): ReturnType<GetDelegatesByOrganizationResponseHandler> =>
  pipe(
    getDelegatesByOrganizationFiscalCode(config, pool)(organizationFiscalCode),
    TE.mapLeft(flow(E.toError, e => ResponseErrorInternal(e.message))),
    TE.chainW(processResponseFromDelegatesResultSet),
    TE.toUnion
  )();

const GetDelegatesByOrganizationHandler = (
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

export default GetDelegatesByOrganizationHandler;
