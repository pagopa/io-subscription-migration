import { getConfigOrThrow } from "../utils/config";
import clientDB from "../utils/dbconnector";
import { getApiClient } from "../utils/apim";
import { initTelemetryClient } from "../utils/appinsight";
import { createServiceChangeHandler } from "./handler";

const config = getConfigOrThrow();

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

// Setup PostgreSQL DB Pool
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
  client,
  telemetryClient
);

export default handleServicesChange;
