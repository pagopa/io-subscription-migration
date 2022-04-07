import express = require("express");
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { Context } from "@azure/functions";
import { getApiClient } from "../utils/apim";
import { getConfigOrThrow } from "../utils/config";
import { getLatestMigrationsHandler } from "./handler";

const config = getConfigOrThrow();

// Get APIM Client
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID
  },
  config.APIM_SUBSCRIPTION_ID
);

const setupExpress = (): express.Express => {
  const app = express();
  app.get(
    "/api/v1/organizations/:organizationFiscalCode/ownership-claims/latest",
    getLatestMigrationsHandler(config, apimClient)
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
