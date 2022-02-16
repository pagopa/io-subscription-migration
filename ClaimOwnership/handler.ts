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
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool } from "pg";
import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { knex } from "knex";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import {
  ApimSubscriptionResponse,
  ApimUserResponse
} from "../models/DomainApimResponse";
import { IApimUserError, toApimUserError } from "../models/DomainErrors";
import { SubscriptionStatus } from "../GetOwnershipClaimStatus/handler";
import { OrganizationQueueItem } from "./types";

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegateId: NonEmptyString
) => Promise<IResponseSuccessJson<void> | IResponseErrorInternal>;

// TO DO: This is the function update status on database
export const updateSqlSubscription = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode,
  delegateId: NonEmptyString
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .where({ sourceId: delegateId })
    .where("status", "!=", SubscriptionStatus.COMPLETED)
    .update({
      status: SubscriptionStatus.PROCESSING
    })
    .from(dbConfig.DB_TABLE)
    .toQuery() as NonEmptyString;

// TO DO: This is the function to write the message on the Queue
export const organizationMessageToQueue = (
  message: OrganizationQueueItem
): Error => new Error("To be implemented");

// TO DO: This is the function to get targetID from APIM
export const getTargetIdFromAPIM = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  apimSubscriptionResponse: ApimSubscriptionResponse
): TE.TaskEither<IApimUserError, ApimUserResponse> =>
  pipe(
    TE.throwError<string, ApimUserResponse>("To be Implementend"),
    x => x,
    TE.mapLeft(toApimUserError)
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
