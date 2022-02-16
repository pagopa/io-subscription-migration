/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal
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
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { knex } from "knex";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { ApimOrganizationUserResponse } from "../models/DomainApimResponse";
import {
  IApimUserError,
  IDbError,
  toApimUserError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import { queryDataTable } from "../utils/db";
import { OrganizationQueueItem } from "./types";

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegateId: NonEmptyString
) => Promise<IResponseSuccessJson<void> | IResponseErrorInternal>;

export const updateSqlSubscription = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .where({ sourceId })
    .where("status", "!=", SubscriptionStatus.COMPLETED)
    .update({
      status: SubscriptionStatus.PROCESSING
    })
    .from(dbConfig.DB_TABLE)
    .toQuery() as NonEmptyString;

export const updateSubscriptionsByOrganizationFiscalCodeAndSourceId = (
  config: IConfig,
  connect: Pool
) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): TE.TaskEither<IDbError, QueryResult<QueryResultRow>> =>
  pipe(
    updateSqlSubscription(config)(organizationFiscalCode, sourceId),
    sql => queryDataTable(connect, sql),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

// TO DO: This is the function to write the message on the Queue
export const organizationMessageToQueue = (
  message: OrganizationQueueItem
): Error => new Error("To be implemented");

export const getTargetIdFromAPIM = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  targetId: NonEmptyString
): TE.TaskEither<IApimUserError, ApimOrganizationUserResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apimClient.user.get(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME,
          targetId
        ),
      () =>
        toApimUserError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.chain(
      flow(
        ApimOrganizationUserResponse.decode,
        TE.fromEither,
        TE.mapLeft(() =>
          toApimUserError("Invalid Apim Organization Response Decode.")
        )
      )
    )
  );

// TO DO: This is the Handler and it's to be implemented!
const createHandler = (config: IConfig, pool: Pool): Handler => (
  _context,
  organizationFiscalCode,
  delegateId
): ReturnType<Handler> =>
  pipe(
    TE.throwError<string, IResponseSuccessJson<void>>("To be Implementend"),
    TE.mapLeft(ResponseErrorInternal),
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
