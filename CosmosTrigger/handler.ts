import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Pool, PoolClient, QueryResult } from "pg";
import { toError } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as dotenv from "dotenv";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { fromPredicate } from "fp-ts/lib/FromEither";
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
    TE.mapLeft(() => ({ kind: "apimusererror" as const })),
    TE.map(userResponse => ({
      email: userResponse.email as EmailString,
      firstName: userResponse.firstName as NonEmptyString,
      id: userResponse.id as NonEmptyString,
      lastName: userResponse.lastName as NonEmptyString
    }))
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedServiceDocument,
  apimData: {
    readonly apimUser: ApimUserResponse;
    readonly apimSubscription: ApimSubscriptionResponse;
  }
): MigrationRowDataTable => ({
  email: apimData.apimUser.email,
  firstName: apimData.apimUser.firstName,
  lastName: apimData.apimUser.lastName,
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,
  ownerId: apimData.apimSubscription.ownerId,
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

export const insertDataTable = (
  dbClient: PoolClient,
  dbConfig: IDecodableConfigPostgreSQL,
  data: MigrationRowDataTable
): TE.TaskEither<IDbError, QueryResult> =>
  queryDataTable(
    dbClient,
    `INSERT INTO "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail")
	VALUES ('${data.subscriptionId}', '${data.organizationFiscalCode}', '${data.ownerId}', '${data.firstName}', '${data.lastName}', '${data.email}')`
  );

export const updateDataTable = (
  dbClient: PoolClient,
  dbConfig: IDecodableConfigPostgreSQL,
  data: MigrationRowDataTable
): TE.TaskEither<IDbError, QueryResult> =>
  queryDataTable(
    dbClient,
    `UPDATE "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}" SET
"organizationFiscalCode" = '${data.organizationFiscalCode}' WHERE
"subscriptionId" = '${data.subscriptionId}';`
  );

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
    TE.chainW(data =>
      /**
       * Mimic an upsert
       */
      retrievedDocument.version
        ? updateDataTable(pool, config, data)
        : insertDataTable(pool, config, data)
    )
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
