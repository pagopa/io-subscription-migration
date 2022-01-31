import { getConfigOrThrow } from "../utils/config";
import clientDB from "../utils/dbconnector";
import { getApiClient } from "../utils/apim";
import { createServiceChangeHandler } from "./handler";

const config = getConfigOrThrow();

// istanzio il client Post Pool
const client = clientDB(config);
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID
  },
  config.APIM_SUBSCRIPTION_ID
);

const handleServicesChange = createServiceChangeHandler(
  config,
  apimClient,
  client
);

export default handleServicesChange;
