/* eslint-disable arrow-body-style */
import {
  ApiManagementClient,
  ErrorResponse as ApimErrorResponse
} from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import { DatabaseError, Pool, QueryResult } from "pg";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/lib/ReadonlyArray";

import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";

import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import knex from "knex";
import { logError, withJsonInput } from "../utils/misc";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";
import { MigrationRowDataTable } from "../models/Domain";
import {
  ApimSubscriptionResponse,
  ApimUserResponse,
  ApimDelegateUserResponse
} from "../models/DomainApimResponse";
import {
  IApimSubError,
  toApimSubError,
  IApimUserError,
  toApimUserError,
  IDbError,
  DomainError,
  toString,
  toPostgreSQLError,
  toApimSubErrorMessage,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";

import {
  trackProcessedServiceDocument,
  trackIgnoredIncomingDocument
} from "../utils/tracking";
import { IncomingQueueItem } from "./types";

// Incoming documents are expected to be of kind RetrievedService
export const validateDocument = RetrievedService.decode;

/*
 ** The right full path for ownerID is in this kind of format:
 ** "/subscriptions/subid/resourceGroups/{resourceGroup}/providers/Microsoft.ApiManagement/service/{apimService}/users/5931a75ae4bbd512a88c680b",
 ** resouce link: https://docs.microsoft.com/en-us/rest/api/apimanagement/current-ga/subscription/get
 */
export const parseOwnerIdFullPath = (
  fullPath: NonEmptyString
): O.Option<NonEmptyString> =>
  pipe(
    fullPath,
    f => f.split("/"),
    O.fromPredicate(a => a.length === 11),
    O.chain(splittedPath =>
      pipe(
        splittedPath,
        RA.last,
        O.chain(s => {
          const decoded = NonEmptyString.decode(s);
          return E.isRight(decoded) ? O.some(decoded.right) : O.none;
        })
      )
    )
  );

export const getApimOwnerBySubscriptionId = (
  apimConfig: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  subscriptionId: NonEmptyString
): TE.TaskEither<IApimSubError, ApimSubscriptionResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apimClient.subscription.get(
          apimConfig.APIM_RESOURCE_GROUP,
          apimConfig.APIM_SERVICE_NAME,
          subscriptionId
        ),
      error =>
        error as ApimErrorResponse & {
          readonly statusCode?: number;
        }
    ),
    TE.mapLeft(flow(toApimSubErrorMessage, toApimSubError)),
    TE.chain(subscriptionResponse =>
      pipe(
        subscriptionResponse.ownerId,
        NonEmptyString.decode,
        E.mapLeft(_ => toApimSubError("Invalid Owner Id.")),
        E.map(parseOwnerIdFullPath),
        E.chainW(
          E.fromOption(() => toApimSubError("Invalid Owner Id Full Path."))
        ),
        TE.fromEither
      )
    ),
    TE.map(ownerId => ({
      ownerId,
      subscriptionId
    }))
  );

export const getApimUserBySubscription = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  apimSubscriptionResponse: ApimSubscriptionResponse
): TE.TaskEither<IApimUserError, ApimUserResponse> =>
  pipe(
    TE.tryCatch(
      () =>
        apimClient.user.get(
          config.APIM_RESOURCE_GROUP,
          config.APIM_SERVICE_NAME,
          apimSubscriptionResponse.ownerId
        ),
      () =>
        toApimUserError(
          "The provided subscription identifier is malformed or invalid or occur an Authetication Error."
        )
    ),
    TE.chain(
      flow(
        ApimUserResponse.decode,
        TE.fromEither,
        TE.mapLeft(() => toApimUserError("Invalid Apim User Response Decode."))
      )
    )
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedService,
  apimData: {
    readonly apimUser: ApimDelegateUserResponse;
    readonly apimSubscription: ApimSubscriptionResponse;
  }
): MigrationRowDataTable => ({
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,

  serviceName: retrievedDocument.serviceName || "",
  serviceVersion: retrievedDocument.version,
  sourceEmail: apimData.apimUser.email,
  sourceId: apimData.apimSubscription.ownerId,
  sourceName: apimData.apimUser.firstName,
  sourceSurname: apimData.apimUser.lastName,
  subscriptionId: retrievedDocument.serviceId
});

export const queryDataTable = (
  pool: Pool,
  query: string
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    TE.tryCatch(
      () => pool.query(query),
      error => error as DatabaseError
    ),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: MigrationRowDataTable,
  excludeStatus: "PENDING" = "PENDING"
): NonEmptyString => {
  return knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .insert(data)
    .onConflict("subscriptionId")
    .merge(["organizationFiscalCode", "serviceVersion", "serviceName"])
    .where(`${dbConfig.DB_TABLE}.status`, "<", excludeStatus)
    .and.whereRaw(
      `"${dbConfig.DB_TABLE}"."serviceVersion" < excluded."serviceVersion"`
    )
    .toQuery() as NonEmptyString;
};
export const storeDocumentApimToDatabase = (
  apimClient: ApiManagementClient,
  config: IConfig,
  pool: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  retrievedDocument: RetrievedService
): TE.TaskEither<DomainError, QueryResult | void> =>
  pipe(
    retrievedDocument.serviceId,
    // given the subscription, retrieve it's apim object
    id => getApimOwnerBySubscriptionId(config, apimClient, id),
    TE.chain(apimSubscription =>
      pipe(
        // given the subscription apim object, retrieve its owner's detail
        getApimUserBySubscription(config, apimClient, apimSubscription),
        // We only consider subscription owned by a Delegate,
        //   otherwise we just ignore the document
        // This because migration are meant to work only from a Delegate to its Organization,
        //   not to migrate subscriptions between organizations
        TE.chain(apimUser =>
          ApimDelegateUserResponse.is(apimUser)
            ? // continue processing incoming document
              pipe(
                { apimSubscription, apimUser },
                apimData => mapDataToTableRow(retrievedDocument, apimData),
                createUpsertSql(config),
                sql => queryDataTable(pool, sql),
                res => {
                  trackProcessedServiceDocument(telemetryClient)(
                    retrievedDocument
                  );
                  return res;
                }
              )
            : // processing is successful, just ignore the document
              TE.of<DomainError, QueryResult | void>(
                trackIgnoredIncomingDocument(telemetryClient)(retrievedDocument)
              )
        )
      )
    )
  );

export const createHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  pool: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    async (context, item): Promise<void> =>
      pipe(
        item,
        IncomingQueueItem.decode,
        E.mapLeft(
          flow(readableReport, logError(context, "Invalid incoming message"))
        ),
        TE.fromEither,
        TE.chainW(({ service }) =>
          pipe(
            service,
            storeDocumentApimToDatabase(
              apimClient,
              config,
              pool,
              telemetryClient
            ),
            TE.mapLeft(
              flow(
                toString,
                logError(
                  context,
                  `Failed to process subscription|${service.id}`
                )
              )
            )
          )
        ),
        TE.map(_ => void 0 /* we expect no return */),
        // let the handler fail
        TE.getOrElse(err => {
          throw err;
        })
      )()
  );
