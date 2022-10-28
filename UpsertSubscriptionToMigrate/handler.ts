/* eslint-disable arrow-body-style */
import {
  ApiManagementClient,
  ErrorResponse as ApimErrorResponse
} from "@azure/arm-apimanagement";
import { flow, pipe } from "fp-ts/lib/function";
import { Pool, QueryResult } from "pg";
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
  DomainError,
  toString,
  toApimSubErrorMessage,
  toPostgreSQLError
} from "../models/DomainErrors";

import {
  trackProcessedServiceDocument,
  trackIgnoredIncomingDocument,
  trackFailedQueryOnDocumentProcessing
} from "../utils/tracking";
import { queryDataTable } from "../utils/db";
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
  // At insert time, is the same value as isVisible
  // At update time, it will be evalued against current and previous isVisible
  // Hence, we can assign the very same value and let the DB engine do the correct evaluation
  hasBeenBooleanOnce: retrievedDocument.isVisible,
  isVisible: retrievedDocument.isVisible,
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,

  serviceName: retrievedDocument.serviceName || "",
  serviceVersion: retrievedDocument.version,
  sourceEmail: apimData.apimUser.email,
  sourceId: apimData.apimSubscription.ownerId,
  sourceName: apimData.apimUser.firstName,
  sourceSurname: apimData.apimUser.lastName,
  subscriptionId: retrievedDocument.serviceId
});

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: MigrationRowDataTable,
  excludeStatus: "PENDING" = "PENDING"
): NonEmptyString => {
  const k = knex({
    client: "pg"
  });
  return k
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .insert(data)
    .onConflict("subscriptionId")
    .merge({
      hasBeenVisibleOnce: k.raw(
        `"${dbConfig.DB_SCHEMA}".${dbConfig.DB_TABLE}."hasBeenVisibleOnce" OR excluded."hasBeenVisibleOnce"`
      ),
      isVisible: k.raw(`excluded."isVisible"`),
      organizationFiscalCode: k.raw(`excluded."organizationFiscalCode"`),
      serviceName: k.raw(`excluded."serviceName"`),
      serviceVersion: k.raw(`excluded."serviceVersion"`)
    })
    .where(`${dbConfig.DB_TABLE}.status`, "<", excludeStatus)
    .and.whereRaw(
      `"${dbConfig.DB_TABLE}"."serviceVersion" <= excluded."serviceVersion"`
    )
    .toQuery() as NonEmptyString;
};

// FIXME: refactor DomainError so that this check is stronger
const isSubscriptionNotFound = (err: DomainError): boolean =>
  err.kind === "apimsuberror" &&
  err.message.startsWith("Subscription not found");

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
        TE.chainW(apimUser =>
          ApimDelegateUserResponse.is(apimUser)
            ? // continue processing incoming document
              pipe(
                { apimSubscription, apimUser },

                // Upsert subscription
                apimData => mapDataToTableRow(retrievedDocument, apimData),
                createUpsertSql(config),
                sql => queryDataTable(pool, sql),

                TE.mapLeft(err => {
                  trackFailedQueryOnDocumentProcessing(telemetryClient)(
                    retrievedDocument,
                    err
                  );
                  return err;
                }),
                TE.mapLeft(err => toPostgreSQLError(err.message)),

                TE.map(_ => {
                  trackProcessedServiceDocument(telemetryClient)(
                    retrievedDocument
                  );
                  return _;
                })
              )
            : // processing is successful, just ignore the document
              TE.of<DomainError, QueryResult | void>(
                trackIgnoredIncomingDocument(telemetryClient)(
                  retrievedDocument,
                  "owner is an admin"
                )
              )
        )
      )
    ),
    // check errors to see if we might fail or just ignore curretn document
    TE.foldW(err => {
      // There are Services in database that have no related Subscription.
      // It's an inconsistent state and should not be present;
      //  however, for Services of early days of IO it may happen as we still have Services created when IO was just a proof-of-concepts
      // We choose to just skip such documents
      if (isSubscriptionNotFound(err)) {
        trackIgnoredIncomingDocument(telemetryClient)(
          retrievedDocument,
          "subsctiption not found"
        );
        return TE.of(void 0);
      } else {
        return TE.left(err);
      }
    }, TE.of)
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
