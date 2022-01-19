import { Context } from "@azure/functions";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import {
  IConfig,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL,
} from "../utils/config";
import { Pool, PoolClient, QueryResult } from "pg";
import { RetrievedServiceDocument } from "../models/RetrievedService";
import { toError } from "fp-ts/lib/Either";
import {
  ApimSubscriptionResponse,
  ApimUserResponse,
} from "../models/DomainApimResponse";
import { pipe } from "fp-ts/lib/function";
import * as dotenv from "dotenv";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { DbError, ApimSubError, ApimUserError } from "../models/DomainErrors";
import { ValidationError } from "io-ts";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { MigrationRowDataTable, OwnerData } from "../models/Domain";

dotenv.config();

export const handleServicesChange = async (
  context: Context,
  config: IConfig,
  apimClient: ApiManagementClient,
  documents: ReadonlyArray<unknown>,
  client: Pool
): Promise<any> => {
  context.log(`Process ${documents.length} documents.`);
  const pool = await client.connect();
  const res = await pipe(documents, () =>
    processoA(
      apimClient,
      config,
      // config as IDecodableConfigAPIM,
      // config as IDecodableConfigPostgreSQL,
      pool,
      documents
    )
  );

  return res;
};

export const processoA = (
  apimClient: ApiManagementClient,
  // apimConfig: IDecodableConfigAPIM,
  // dbConfig: IDecodableConfigPostgreSQL,
  config: IConfig,
  pool: PoolClient,
  documents: ReadonlyArray<unknown>
): ReadonlyArray<void | TE.TaskEither<
  DbError | ApimSubError | ApimUserError,
  QueryResult
>> => {
  return pipe(
    documents,
    RA.map(validateDocument),
    RA.map((d) =>
      E.isRight(d) ? processB(apimClient, config, pool, d.right) : log()
    )
  );
};

export const validateDocument = (
  document: unknown
): E.Either<string, RetrievedServiceDocument> => {
  return pipe(
    RetrievedServiceDocument.decode(document),
    E.mapLeft(() => `Errore su ${document}`)
  );
};

export const processB = (
  apimClient: ApiManagementClient,
  // apimConfig: IDecodableConfigAPIM,
  // dbConfig: IDecodableConfigPostgreSQL,
  config: IConfig,
  pool: PoolClient,
  retrievedDocument: RetrievedServiceDocument
): TE.TaskEither<DbError | ApimSubError | ApimUserError, QueryResult> => {
  const res = pipe(
    /*
    1. Leggere l'OwnerId dalla Subscription Id
    2. Leggere i dati dell'Owner dall'Owner Id
    3. Mappare i dati
    4. Inserire i dati
    */
    retrievedDocument.subscriptionId,
    (id) => getApimOwnerBySubscriptionId(config, apimClient, id),
    TE.chainW((res) => getApimUserByOwnerId(config, apimClient, res)),
    TE.map((owner) => mapDataToTableRow(retrievedDocument, owner)),
    TE.chainW((data) => insertDataTable(pool, config, data))
  );
  return res;
};

export const getApimOwnerBySubscriptionId = (
  apimConfig: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  subscriptionId: NonEmptyString
): TE.TaskEither<ApimSubError, ApimSubscriptionResponse> => {
  const res = pipe(
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
    TE.map((subscriptionResponse) => ({
      subscriptionId,
      ownerId: (subscriptionResponse.ownerId as NonEmptyString).substring(
        (subscriptionResponse.ownerId as NonEmptyString).lastIndexOf("/") + 1
      ) as NonEmptyString,
    }))
  );
  return res;
};

export const getApimUserByOwnerId = (
  config: IDecodableConfigAPIM,
  apimClient: ApiManagementClient,
  apimSubscriptionResponse: ApimSubscriptionResponse
): TE.TaskEither<ApimUserError, OwnerData> => {
  console.log(apimSubscriptionResponse);
  const res = pipe(
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
    TE.map((userResponse) => ({
      ...apimSubscriptionResponse,
      id: userResponse.id as NonEmptyString,
      firstName: userResponse.firstName as NonEmptyString,
      lastName: userResponse.lastName as NonEmptyString,
      email: userResponse.email as EmailString,
    }))
  );
  return res;
};

export const mapDataToTableRow = (
  retrievedDocument: RetrievedServiceDocument,
  owner: OwnerData
): MigrationRowDataTable => {
  return {
    subscriptionId: retrievedDocument.subscriptionId,
    organizationFiscalCode: retrievedDocument.organizationFiscalCode,
    ownerId: owner.ownerId,
    firstName: owner.firstName,
    lastName: owner.lastName,
    email: owner.email,
  };
};

export const insertDataTable = (
  dbClient: PoolClient,
  dbConfig: IDecodableConfigPostgreSQL,
  data: MigrationRowDataTable
): TE.TaskEither<DbError, QueryResult> => {
  return pipe(
    TE.tryCatch(() => {
      return dbClient.query(`INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail")
	VALUES ('${data.subscriptionId}', '${data.organizationFiscalCode}', '${data.ownerId}', '${data.firstName}', '${data.lastName}', '${data.email}')`);
    }, toError),
    TE.mapLeft((e) => {
      console.log(e);
      return DbError.Error;
    })
  );
};

export const log = () => {};
