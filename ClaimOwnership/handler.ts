import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import { wrapRequestHandler } from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";

type Handler = () => Promise<
  IResponseSuccessJson<void> | IResponseErrorInternal
>;

// TO DO: This is the Handler and it's to be implemented!
const createHandler = (): Handler => (): ReturnType<Handler> =>
  pipe(
    TE.throwError<string, IResponseSuccessJson<void>>("To be Implementend"),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();

const ClaimOwnershipHandler = (): express.RequestHandler => {
  const handler = createHandler();
  return wrapRequestHandler(handler);
};

export default ClaimOwnershipHandler;
