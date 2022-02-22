import { getConfigOrThrow } from "../utils/config";
import { getApiClient } from "../utils/apim";
import getPool from "../utils/db";
import { createHandler } from "./handler";

const config = getConfigOrThrow();
const client = getPool(config);
// Get APIM Client
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID
  },
  config.APIM_SUBSCRIPTION_ID
);

const handleServicesChange = createHandler(config, apimClient, client);

export default handleServicesChange;
