import { ContextMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Context } from "@azure/functions";

interface IMessage {
  readonly message: string;
}
type GetStatusHandler = (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_id: NonEmptyString
) => Promise<IResponseSuccessJson<IMessage> | IResponseErrorInternal>;

const GetStatusHandler = (): GetStatusHandler => async (
  context: Context,
  organizationFiscalCode: OrganizationFiscalCode,
  delegate_id: NonEmptyString
): Promise<IResponseSuccessJson<IMessage> | IResponseErrorInternal> => {
  context.log(`Starting Status for: ${organizationFiscalCode} ${delegate_id}`);
  return Promise.resolve(
    ResponseSuccessJson({ message: "Function status is working" })
  );
};

export const Handler = (): express.RequestHandler => {
  const handler = GetStatusHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};
