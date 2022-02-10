import { Context } from "@azure/functions";
import createAzureFunctionHandler from "@pagopa/express-azure-functions/dist/src/createAzureFunctionsHandler";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";
import * as express from "express";
import Handler from "./handler";

const setupExpress = (): express.Express => {
  const app = express();
  app.get(
    "/api/v1/organizations/:organizationFiscalCode/ownership-claims/:delegate_id",
    Handler()
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
