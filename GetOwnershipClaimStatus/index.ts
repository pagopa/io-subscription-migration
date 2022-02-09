import { Context, HttpRequest } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";
import { getConfigOrThrow } from "../utils/config";
import clientDB from "../utils/dbconnector";
import { Handler } from "./handler";

const config = getConfigOrThrow();
const client = clientDB(config);
const setupExpress = (): express.Express => {
  const app = express();
  app.get(
    "/api/v1/organization/:organizationFiscalCode/ownership-status/:delegate_id",
    Handler(config, client)()
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
