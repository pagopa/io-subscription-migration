/* eslint-disable @typescript-eslint/no-unused-vars */
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Context } from "io-ts";
import { Pool } from "pg";
import { initTelemetryClient } from "../utils/appinsight";
import { IConfig } from "../utils/config";

export const createHandler = (
  config: IConfig,
  apimClient: ApiManagementClient,
  client: Pool,
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (context: Context, documents: unknown): Promise<void> => {
  throw new Error("not implemented yet!");
};
