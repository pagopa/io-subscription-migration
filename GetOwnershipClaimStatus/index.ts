import { Context, HttpRequest } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import {
  ContextMiddleware,
  setAppContext
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import {
  withRequestMiddlewares,
  wrapRequestHandler
} from "@pagopa/ts-commons/lib/request_middleware";
import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  // ResponseErrorInternal,
  ResponseSuccessJson
} from "@pagopa/ts-commons/lib/responses";
import { RequiredParamMiddleware } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/required_param";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";

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
  context.log(`Starting Status ${organizationFiscalCode} ${delegate_id}`);
  return Promise.resolve(
    ResponseSuccessJson({ message: "Function status is working" })
  );
};

const Handler = (): express.RequestHandler => {
  const handler = GetStatusHandler();
  const middlewaresWrap = withRequestMiddlewares(
    ContextMiddleware(),
    RequiredParamMiddleware("organizationFiscalCode", OrganizationFiscalCode),
    RequiredParamMiddleware("delegate_id", NonEmptyString)
  );
  return wrapRequestHandler(middlewaresWrap(handler));
};

const setupExpress = (): express.Express => {
  const app = express();
  app.get(
    "/api/v1/organization/:organizationFiscalCode/ownership-status/:delegate_id",
    Handler()
  );
  return app;
};

const appExpress = setupExpress();
const azureFunctionHandler = createAzureFunctionHandler(appExpress);

const httpStart = (context: Context, request: HttpRequest): void => {
  context.log("HTTP START", request.url);
  setAppContext(appExpress, context);
  azureFunctionHandler(context);
};

export default httpStart;
