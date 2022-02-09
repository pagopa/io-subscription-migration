import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";
import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import ClaimProcedureStatusHandler from "./handler";

const config = getConfigOrThrow();
const client = getPool(config);
const setupExpress = (): express.Express => {
  const app = express();
  app.get(
    "/api/v1/organizations/:organizationFiscalCode/ownership-claims/:delegate_id",
    ClaimProcedureStatusHandler(config, client)()
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
