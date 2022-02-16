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
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { Context } from "@azure/functions";
import { knex } from "knex";
import { IConfig, IDecodableConfigPostgreSQL } from "../utils/config";
import {
  IDbError,
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

export const organizationMessageToQueue = (context: Context) => (
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
): E.Either<boolean, boolean> =>
  pipe(
    { organizationFiscalCode, sourceId },
    OrganizationQueueItem.decode,
    E.mapLeft(_ => false),
    E.chain(
      flow(
        JSON.stringify,
        validMessage => {
          // eslint-disable-next-line functional/immutable-data
          context.bindings.incomingSubscriptions = validMessage;
        },
        () => E.of(true)
      )
    )
  );

const createHandler = (config: IConfig, pool: Pool): Handler => (
  context,
  organizationFiscalCode,
  delegateId
): ReturnType<Handler> =>
  pipe(
    updateSubscriptionsByOrganizationFiscalCodeAndSourceId(config, pool)(
      organizationFiscalCode,
      delegateId
    ),
    TE.mapLeft(E.toError),
    TE.chain(_ =>
      pipe(
        organizationMessageToQueue(context)(organizationFiscalCode, delegateId),
        E.mapLeft(E.toError),
        TE.fromEither
      )
    ),
    TE.mapLeft(e => ResponseErrorInternal(`Errore: ${e.message}`)),
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
