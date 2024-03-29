/* eslint-disable extra-rules/no-commented-out-code */
import {
  IResponseErrorInternal,
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
import * as TE from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { Context } from "@azure/functions";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import { queryDataTable } from "../utils/db";

import { MigrationsByOrganization } from "../utils/query";
import { ClaimOrganizationSubscriptions } from "./types";

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegateId: NonEmptyString
) => Promise<IResponseSuccessJson<void> | IResponseErrorInternal>;

/*
 * The purpose of this function is to update the status of every subscriptions to PROCESSING for each one that isn't COMPLETED yet.
 */
export const generateUpdateSubscriptionStatusSQL = (
  dbConfig: IDecodableConfigPostgreSQL
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString,
  status: SubscriptionStatus
): NonEmptyString =>
  MigrationsByOrganization(dbConfig, organizationFiscalCode)
    .where({ sourceId })
    .where("status", "!=", SubscriptionStatus.COMPLETED)
    .update({ status })
    .toQuery() as NonEmptyString;

export const updateSubscriptionStatus = (config: IConfig, connect: Pool) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString,
  status: SubscriptionStatus
): TE.TaskEither<IDbError, QueryResult<QueryResultRow>> =>
  pipe(
    generateUpdateSubscriptionStatusSQL(config)(
      organizationFiscalCode,
      sourceId,
      status
    ),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const dispatchMessageToQueue = (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): string =>
  pipe(
    { organizationFiscalCode, sourceId },
    ClaimOrganizationSubscriptions.encode,
    JSON.stringify
  );

const createHandler = (config: IConfig, pool: Pool): Handler => (
  context,
  organizationFiscalCode,
  delegateId
): ReturnType<Handler> =>
  pipe(
    updateSubscriptionStatus(config, pool)(
      organizationFiscalCode,
      delegateId,
      SubscriptionStatus.PROCESSING
    ),
    TE.mapLeft(e => ResponseErrorInternal(`Error on ${e.message}`)),
    TE.map(() => dispatchMessageToQueue(organizationFiscalCode, delegateId)),
    // eslint-disable-next-line functional/immutable-data
    TE.map(message => (context.bindings.migrateallsubscriptionsjobs = message)),
    TE.map(_ => ResponseSuccessJson(void 0)),
    TE.toUnion
  )();

const ClaimOwnershipHandler = (
  config: IConfig,
  client: Pool
): express.RequestHandler => {
  const handler = createHandler(config, client);
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};

export default ClaimOwnershipHandler;
