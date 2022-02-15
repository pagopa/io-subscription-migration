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
import { OrganizationResponseDelegates } from "../generated/definitions/OrganizationResponseDelegates";

type GetDelegatesByOrganizationResponseHandler = () => Promise<
  | IResponseSuccessJson<OrganizationResponseDelegates>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

// TO DO: This is the Handler and it's to be implemented!
const createHandler = (): GetDelegatesByOrganizationResponseHandler => (): ReturnType<
  GetDelegatesByOrganizationResponseHandler
> =>
  pipe(
    TE.throwError<string, IResponseSuccessJson<OrganizationResponseDelegates>>(
      "To be Implementend"
    ),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();

const GetDelegatesByOrganizationHandler = (): express.RequestHandler => {
  const handler = createHandler();
  return wrapRequestHandler(handler);
};

export default GetDelegatesByOrganizationHandler;
