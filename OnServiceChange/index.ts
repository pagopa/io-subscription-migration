import { getConfigOrThrow } from "../utils/config";
import { initTelemetryClient } from "../utils/appinsight";
import { createServiceChangeHandler } from "./handler";

const config = getConfigOrThrow();

// Setup Appinsight
const telemetryClient = initTelemetryClient(config);

const handleServicesChange = createServiceChangeHandler(telemetryClient);

export default handleServicesChange;
