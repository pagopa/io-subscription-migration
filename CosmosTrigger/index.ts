import { Context } from "@azure/functions";
import { handleServicesChange } from "./handler";
import { getConfigOrThrow } from "../utils/config";
import clientDB from "../utils/dbconnector";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { getApiClient } from "../utils/apim";

const config = getConfigOrThrow();

const run = async (context: Context, documents: ReadonlyArray<unknown>) => {
  // istanzio il client Post Pool
  const client = await clientDB(config);
  const apimClient = getApiClient(
    {
      clientId: config.APIM_CLIENT_ID,
      secret: config.APIM_SECRET,
      tenantId: config.APIM_TENANT_ID,
    },
    config.APIM_SUBSCRIPTION_ID
  );

  return handleServicesChange(context, config, apimClient, documents, client);
};

export default run;

/*
- manualmente

-> change feed cosmos -> APIM -> dato apim + dato cosmos -> Utility -> struttura postrgresql
APIM Progetto -> HTTP
Struttura -> HTTP
*/
