import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import { wrapRequestHandler } from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import knex from "knex";
import { OrganizationDelegates } from "../generated/definitions/OrganizationDelegates";
import { IDecodableConfigPostgreSQL } from "../utils/config";

type GetDelegatesByOrganizationResponseHandler = () => Promise<
  | IResponseSuccessJson<{ readonly data: OrganizationDelegates }>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

export const createSqlDelegates = (dbConfig: IDecodableConfigPostgreSQL) => (
  organizationFiscalCode: OrganizationFiscalCode
): NonEmptyString =>
  knex({
    client: "pg"
  })
    .withSchema(dbConfig.DB_SCHEMA)
    .table(dbConfig.DB_TABLE)
    .select(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .count("subscriptionId")
    .from(dbConfig.DB_TABLE)
    .where({ organizationFiscalCode })
    .groupBy(["sourceId", "sourceName", "sourceSurname", "sourceEmail"])
    .toQuery() as NonEmptyString;

// TO DO: This is the Handler and it's to be implemented!
const createHandler = (): GetDelegatesByOrganizationResponseHandler => (): ReturnType<
  GetDelegatesByOrganizationResponseHandler
> =>
  pipe(
    TE.throwError<
      string,
      IResponseSuccessJson<{ readonly data: OrganizationDelegates }>
    >("To be Implementend"),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();

const GetDelegatesByOrganizationHandler = (): express.RequestHandler => {
  const handler = createHandler();
  return wrapRequestHandler(handler);
};

export default GetDelegatesByOrganizationHandler;
