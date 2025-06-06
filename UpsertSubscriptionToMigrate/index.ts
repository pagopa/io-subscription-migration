import { getConfigOrThrow } from "../utils/config";
import getPool from "../utils/db";
import { getApiClient } from "../utils/apim";
import { initTelemetryClient } from "../utils/appinsight";
import { createHandler } from "./handler";

const config = getConfigOrThrow();

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

// Setup PostgreSQL DB Pool
const pool = getPool(config);
const apimClient = getApiClient(config.APIM_SUBSCRIPTION_ID);

const handleServicesChange = createHandler(
  config,
  apimClient,
  pool,
  telemetryClient
);

export default handleServicesChange;
