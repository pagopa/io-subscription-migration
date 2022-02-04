/* eslint-disable no-console */
import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Pool, PoolClient, QueryResult } from "pg";
import { flow, pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as T from "fp-ts/lib/Task";
import * as O from "fp-ts/lib/Option";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  IDbError,
  IApimSubError,
  IApimUserError,
  DomainError,
  toApimSubError,
  toApimUserError
} from "../models/DomainErrors";
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse,
  ApimUserResponse
} from "../models/DomainApimResponse";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { MigrationRowDataTable } from "../models/Domain";
import {
  ErrorApimResponse,
  ErrorPostgreSQL,
  mapApimSubError,
  mapPostgreSQLError
} from "../utils/mapError";
import { initTelemetryClient } from "../utils/appinsight";

export const validateDocument = (
  document: unknown
): E.Either<string, RetrievedService> =>
  pipe(
    RetrievedService.decode(document),
    E.mapLeft(() => `Errore su ${document}`)
  );

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
      error => mapApimSubError(error as ErrorApimResponse)
    ),
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
  dbClient: PoolClient,
  query: string
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    TE.tryCatch(
      () => dbClient.query(query),
      error => mapPostgreSQLError(error as ErrorPostgreSQL)
    )
  );

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: MigrationRowDataTable,
  excludeStatus: "PENDING" = "PENDING"
): NonEmptyString =>
  `INSERT INTO "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}"(
        "subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
        "sourceSurname", "sourceEmail", "serviceVersion", "serviceName")
        VALUES ('${data.subscriptionId}', '${data.organizationFiscalCode}', '${data.sourceId}', '${data.sourceName}', '${data.sourceSurname}', '${data.sourceEmail}', '${data.serviceVersion}', '${data.serviceName}')
        ON CONFLICT ("subscriptionId")
        DO UPDATE
            SET "organizationFiscalCode" = "excluded"."organizationFiscalCode",
            "serviceVersion" = "excluded"."serviceVersion",
            "serviceName" = "excluded"."serviceName"
            WHERE "ServicesMigration"."Services"."status" <> '${excludeStatus}'
            AND "ServicesMigration"."Services"."serviceVersion" < "excluded"."serviceVersion"
    ` as NonEmptyString;

export const log = (d: unknown): void => {
  throw new Error(`To be implement ${d}`);
};

export const onInvalidDocument = (
  d: unknown,
  telemetryClient: ReturnType<typeof initTelemetryClient>
): T.Task<void> => {
  telemetryClient.trackEvent({
    name: "selfcare.services.oninvaliddocument",
    properties: {
      documentId: (d as RetrievedService).serviceId,
      message: "Invalid document received"
    },
    tagOverrides: { samplingEnabled: "false" }
  });
  throw new Error(`To be implement ${JSON.stringify(d, null, 2)}`);
};

export const onIgnoredDocument = (
  d: unknown,
  telemetryClient: ReturnType<typeof initTelemetryClient>
): void => {
  telemetryClient.trackEvent({
    name: "selfcare.services.onignoredocument",
    properties: {
      documentId: (d as RetrievedService).serviceId,
      message: "Ignore document"
    },
    tagOverrides: { samplingEnabled: "false" }
  });
  return void 0;
};

export const storeDocumentApimToDatabase = (
  apimClient: ApiManagementClient,
  config: IConfig,
  pool: PoolClient,
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
                  telemetryClient.trackEvent({
                    name: "selfcare.services.processeddocument",
                    properties: {
                      difference: Math.floor(
                        // Cosmos store ts in second so we need to translate in milliseconds
                        // eslint-disable-next-line no-underscore-dangle
                        new Date().getTime() - retrievedDocument._ts * 1000
                      ),
                      message: "Processed document",
                      serviceId: retrievedDocument.serviceId
                    },
                    tagOverrides: { samplingEnabled: "false" }
                  });
                  return res;
                }
              )
            : // processing is successful, just ignore the document
              TE.of<DomainError, QueryResult | void>(
                onIgnoredDocument(retrievedDocument, telemetryClient)
              )
        )
      )
    )
  );

export const createServiceChangeHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  client: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => async (
  context: Context,
  documents: ReadonlyArray<unknown>
): Promise<void> => {
  const logPrefix = context.executionContext.functionName;
  context.log(`${logPrefix}|Process ${documents.length} documents.`);
  const pool = await client.connect();
  return pipe(
    documents,
    RA.map(validateDocument),
    RA.map(
      E.fold(
        document => onInvalidDocument(document, telemetryClient),
        flow(
          document =>
            storeDocumentApimToDatabase(
              apimClient,
              config,
              pool,
              telemetryClient
            )(document),
          TE.mapLeft(err => context.log(`${logPrefix}|Error ${err.kind}.`)),
          TE.map(value =>
            context.log(`${logPrefix}|Process ${value} document.`)
          ),
          TE.toUnion
        )
      )
    ),
    RA.sequence(T.ApplicativePar),
    T.map(_ => void 0)
  )();
};
