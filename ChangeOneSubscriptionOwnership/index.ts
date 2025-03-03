import { getConfigOrThrow } from "../utils/config";
import { getApiClient } from "../utils/apim";
import getPool from "../utils/db";
import { initTelemetryClient } from "../utils/appinsight";
import { createHandler } from "./handler";

const config = getConfigOrThrow();
const client = getPool(config);
// Get APIM Client
const apimClient = getApiClient(config.APIM_SUBSCRIPTION_ID);

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

const handleServicesChange = createHandler(
  config,
  apimClient,
  client,
  telemetryClient
);

export default handleServicesChange;
