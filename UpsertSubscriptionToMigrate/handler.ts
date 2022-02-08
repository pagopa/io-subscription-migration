import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Pool } from "pg";
import { initTelemetryClient } from "../utils/appinsight";
import { IConfig } from "../utils/config";
import { withJsonInput } from "../utils/misc";

export const createHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient,
  _client: Pool,
  _telemetryClient: ReturnType<typeof initTelemetryClient>
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    (_context, _item): Promise<void> => {
      throw new Error("not implemented yet!");
    }
  );
