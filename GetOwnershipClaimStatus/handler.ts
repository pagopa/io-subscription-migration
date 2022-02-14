import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseErrorNotFound,
  IResponseSuccessJson,
  ResponseErrorInternal
} from "@pagopa/ts-commons/lib/responses";
import { Context } from "@azure/functions";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import { ClaimProcedureStatus } from "../generated/definitions/ClaimProcedureStatus";

type Handler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
) => Promise<
  | IResponseSuccessJson<ClaimProcedureStatus>
  | IResponseErrorInternal
  | IResponseErrorNotFound
>;

const createHandler = (): Handler => (
  _context,
  _organizationFiscalCode,
  _sourceId
): ReturnType<Handler> =>
  Promise.resolve(ResponseErrorInternal("Handler to be implement"));

const ClaimProcedureStatusHandler = (): express.RequestHandler => {
  const handler = createHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};

export default ClaimProcedureStatusHandler;
