import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Pool, PoolClient, QueryResult } from "pg";
import { toError } from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as dotenv from "dotenv";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  IDbError,
  IApimSubError,
  IApimUserError,
  DomainError
} from "../models/DomainErrors";
import {
  ApimSubscriptionResponse,
  ApimUserResponse
} from "../models/DomainApimResponse";
import { RetrievedServiceDocument } from "../models/RetrievedService";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { MigrationRowDataTable } from "../models/Domain";

dotenv.config();

export const validateDocument = (
  document: unknown
): E.Either<string, RetrievedServiceDocument> =>
  pipe(
    RetrievedServiceDocument.decode(document),
    E.mapLeft(() => `Errore su ${document}`)
  );

export const parseOwnerIdFullPath = (
  fullPath: NonEmptyString
): O.Option<NonEmptyString> =>
  pipe(
    fullPath,
    f => f.split("/"),
    RA.last,
    O.chain(s => {
      const decoded = NonEmptyString.decode(s);
      return E.isRight(decoded) ? O.some(decoded.right) : O.none;
    })
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
      toError
    ),
    TE.mapLeft(() => ({ kind: "apimsuberror" as const })),
    TE.chain(subscriptionResponse =>
      pipe(
        subscriptionResponse.ownerId,
        NonEmptyString.decode,
        E.mapLeft(_ => ({
          kind: "apimsuberror" as const /* TODO: add error detail */
        })),
        E.map(parseOwnerIdFullPath),
        E.chainW(
          E.fromOption(() => ({
            kind: "apimsuberror" as const /* TODO: add error detail */
          }))
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
      toError
    ),
    TE.mapLeft(() => ({
      kind: "apimusererror" as const /* TODO: add error detail */
    })),
    TE.chainW(
      flow(
        ApimUserResponse.decode,
        TE.fromEither,
        TE.mapLeft(() => ({
          kind: "apimusererror" as const /* TODO: add error detail */
        }))
      )
    )
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedServiceDocument,
  apimData: {
    readonly apimUser: ApimUserResponse;
    readonly apimSubscription: ApimSubscriptionResponse;
  }
): MigrationRowDataTable => ({
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,
  sourceEmail: apimData.apimUser.email,
  sourceId: apimData.apimSubscription.ownerId,
  sourceName: apimData.apimUser.firstName,
  sourceSurname: apimData.apimUser.lastName,
  subscriptionId: retrievedDocument.subscriptionId
});

export const queryDataTable = (
  dbClient: PoolClient,
  query: string
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    TE.tryCatch(() => dbClient.query(query), toError),
    TE.mapLeft(() => ({ kind: "dberror" as const }))
  );

export const createUpsertSql = (dbConfig: IDecodableConfigPostgreSQL) => (
  data: MigrationRowDataTable,
  excludeStatus: "PENDING" = "PENDING"
): NonEmptyString =>
  `INSERT INTO "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}"(
        "subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
        "sourceSurname", "sourceEmail")
        VALUES ('${data.subscriptionId}', '${data.organizationFiscalCode}', '${data.sourceId}', '${data.sourceName}', '${data.sourceSurname}', '${data.sourceEmail}')
        ON CONFLICT ("subscriptionId")
        DO UPDATE
            SET "organizationFiscalCode" = "excluded"."organizationFiscalCode"
            WHERE "ServicesMigration"."Services"."status" <> '${excludeStatus}'
    ` as NonEmptyString;

export const log = (d: unknown): void => {
  throw new Error(`To be implement ${d}`);
};

export const onInvalidDocument = (d: unknown): void => {
  throw new Error(`To be implement ${d}`);
};

export const storeDocumentApimToDatabase = (
  apimClient: ApiManagementClient,
  config: IConfig,
  pool: PoolClient,
  retrievedDocument: RetrievedServiceDocument
): TE.TaskEither<DomainError, QueryResult> =>
  pipe(
    /*
    1. Leggere l'OwnerId dalla Subscription Id
    2. Leggere i dati dell'Owner dall'Owner Id
    3. Mappare i dati
    4. Inserire i dati
    */
    retrievedDocument.subscriptionId,
    id => getApimOwnerBySubscriptionId(config, apimClient, id),
    TE.chainW(apimSubscription =>
      pipe(
        getApimUserBySubscription(config, apimClient, apimSubscription),
        TE.map(apimUser => ({ apimSubscription, apimUser }))
      )
    ),
    TE.map(apimData => mapDataToTableRow(retrievedDocument, apimData)),
    TE.map(createUpsertSql(config)),
    TE.chainW(sql => queryDataTable(pool, sql))
  );

export const createServiceChangeHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  client: Pool
) => async (
  context: Context,
  documents: ReadonlyArray<unknown>
): Promise<
  ReadonlyArray<void | TE.TaskEither<
    IApimSubError | IApimUserError | IDbError,
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    QueryResult<any>
  >>
> => {
  context.log(`Process ${documents.length} documents.`);
  const pool = await client.connect();
  return pipe(
    documents,
    RA.map(validateDocument),
    RA.map(d =>
      E.isRight(d)
        ? storeDocumentApimToDatabase(apimClient, config, pool, d.right)
        : onInvalidDocument(d)
    )
  );
};
