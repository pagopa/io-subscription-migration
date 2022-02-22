import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import { getApiClient } from "../utils/apim";
import { createHandler } from "./handler";

const config = getConfigOrThrow();
// Setup PostgreSQL DB Pool
const pool = getPool(config);
// Get APIM Client
const apimClient = getApiClient(
  {
    clientId: config.APIM_CLIENT_ID,
    secret: config.APIM_SECRET,
    tenantId: config.APIM_TENANT_ID
  },
  config.APIM_SUBSCRIPTION_ID
);

const handleChangeAllSubscriptionsOwnership = createHandler(
  config,
  apimClient,
  pool
);

export default handleChangeAllSubscriptionsOwnership;
