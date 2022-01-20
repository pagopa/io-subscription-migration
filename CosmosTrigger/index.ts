import { Context } from "@azure/functions";
import { getConfigOrThrow } from "../utils/config";
import clientDB from "../utils/dbconnector";
import { getApiClient } from "../utils/apim";
import { handleServicesChange } from "./handler";

const config = getConfigOrThrow();

const run = async (
  context: Context,
  documents: ReadonlyArray<unknown>
): Promise<void> => {
  // istanzio il client Post Pool
  const client = clientDB(config);
  const apimClient = getApiClient(
    {
      clientId: config.APIM_CLIENT_ID,
      secret: config.APIM_SECRET,
      tenantId: config.APIM_TENANT_ID,
    },
    config.APIM_SUBSCRIPTION_ID
  );

  return handleServicesChange(
    context,
    config,
    apimClient,
    documents,
    client
  ) as any;
};

export default run;
