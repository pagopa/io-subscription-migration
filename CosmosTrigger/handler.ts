import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Pool, PoolClient, QueryResult } from "pg";
import { toError } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as dotenv from "dotenv";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { DbError, ApimSubError, ApimUserError } from "../models/DomainErrors";
import { ApimSubscriptionResponse } from "../models/DomainApimResponse";
import { RetrievedServiceDocument } from "../models/RetrievedService";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../utils/config";
import { MigrationRowDataTable, OwnerData } from "../models/Domain";

dotenv.config();

export const validateDocument = (
  document: unknown
): E.Either<string, RetrievedServiceDocument> =>
  pipe(
    RetrievedServiceDocument.decode(document),
    E.mapLeft(() => `Errore su ${document}`)
  );

export const getApimOwnerBySubscriptionId = (
  apimConfig: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  subscriptionId: NonEmptyString
): TE.TaskEither<ApimSubError, ApimSubscriptionResponse> =>
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
    TE.mapLeft(() => ApimSubError.Error),
    TE.map(subscriptionResponse => ({
      ownerId: (subscriptionResponse.ownerId as NonEmptyString).substring(
        (subscriptionResponse.ownerId as NonEmptyString).lastIndexOf("/") + 1
      ) as NonEmptyString,
      subscriptionId
    }))
  );

export const getApimUserByOwnerId = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  apimSubscriptionResponse: ApimSubscriptionResponse
): TE.TaskEither<ApimUserError, OwnerData> =>
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
    TE.mapLeft(() => ApimUserError.Error),
    TE.map(userResponse => ({
      ...apimSubscriptionResponse,
      email: userResponse.email as EmailString,
      firstName: userResponse.firstName as NonEmptyString,
      id: userResponse.id as NonEmptyString,
      lastName: userResponse.lastName as NonEmptyString
    }))
  );

export const mapDataToTableRow = (
  retrievedDocument: RetrievedServiceDocument,
  owner: OwnerData
): MigrationRowDataTable => ({
  email: owner.email,
  firstName: owner.firstName,
  lastName: owner.lastName,
  organizationFiscalCode: retrievedDocument.organizationFiscalCode,
  ownerId: owner.ownerId,
  subscriptionId: retrievedDocument.subscriptionId
});

export const queryDataTable = (
  dbClient: PoolClient,
  query: string
): TE.TaskEither<DbError, QueryResult> =>
  pipe(
    TE.tryCatch(() => dbClient.query(query), toError),
    TE.mapLeft(() => DbError.Error)
  );

export const insertDataTable = (
  dbClient: PoolClient,
  dbConfig: IDecodableConfigPostgreSQL,
  data: MigrationRowDataTable
): TE.TaskEither<DbError, QueryResult> =>
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
): TE.TaskEither<DbError, QueryResult> =>
  queryDataTable(
    dbClient,
    `UPDATE "${dbConfig.DB_SCHEMA}"."${dbConfig.DB_TABLE}" SET
"organizationFiscalCode" = '${data.organizationFiscalCode}' WHERE
"subscriptionId" = '${data.subscriptionId}';`
  );

export const log = (d: unknown): void => {
  throw new Error(`To be implement ${d}`);
};

export const storeDocumentApimToDatabase = (
  apimClient: ApiManagementClient,
  config: IConfig,
  pool: PoolClient,
  retrievedDocument: RetrievedServiceDocument
): TE.TaskEither<DbError | ApimSubError | ApimUserError, QueryResult> =>
  pipe(
    /*
    1. Leggere l'OwnerId dalla Subscription Id
    2. Leggere i dati dell'Owner dall'Owner Id
    3. Mappare i dati
    4. Inserire i dati
    */
    retrievedDocument.subscriptionId,
    id => getApimOwnerBySubscriptionId(config, apimClient, id),
    TE.chainW(res => getApimUserByOwnerId(config, apimClient, res)),
    TE.map(owner => mapDataToTableRow(retrievedDocument, owner)),
    TE.chainW(data =>
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
    ApimSubError | ApimUserError | DbError,
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
        : log(d)
    )
  );
};
