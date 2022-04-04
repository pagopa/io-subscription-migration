import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import { OrganizationFiscalCode } from "@pagopa/ts-commons/lib/strings";
import * as express from "express";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { MigrationsStatus } from "../generated/definitions/MigrationsStatus";
import { IConfig } from "../utils/config";

type Handler = () => Promise<
  | IResponseSuccessJson<{ readonly data: MigrationsStatus }>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

export const createHandler = (): Handler => (): ReturnType<Handler> =>
  pipe(
    TE.throwError<
      string,
      IResponseSuccessJson<{ readonly data: MigrationsStatus }>
    >("To be Implementend"),
    TE.mapLeft(ResponseErrorInternal),
    TE.toUnion
  )();

export const getLatestMigrationsHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient
): express.RequestHandler => {
  const handler = createHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
