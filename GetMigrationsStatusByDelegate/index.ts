import express = require("express");
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { Context } from "@azure/functions";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import { getHandler } from "./handler";

const config = getConfigOrThrow();
const client = getPool(config);

const setupExpress = (): express.Express => {
  const app = express();
  secureExpressApp(app);
  app.get(
    "/api/v1/delegates/:delegate_id/claimed-ownerships",
    getHandler(config, client)
  );
  return app;
};

const appExpress = setupExpress();
const azureFunctionHandler = createAzureFunctionHandler(appExpress);

const httpStart = (context: Context): void => {
  setAppContext(appExpress, context);
  azureFunctionHandler(context);
};

export default httpStart;
