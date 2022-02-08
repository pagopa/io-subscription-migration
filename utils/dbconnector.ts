import { Pool } from "pg";
import { IDecodableConfigPostgreSQL } from "./config";

// eslint-disable-next-line functional/no-let
let singletonPool: Pool;
export const getPool = (config: IDecodableConfigPostgreSQL): Pool => {
  if (!singletonPool) {
    singletonPool = new Pool({
      database: config.DB_NAME,
      host: config.DB_HOST,
      idleTimeoutMillis: config.DB_IDLE_TIMEOUT,
      max: 20,
      password: config.DB_PASSWORD,
      port: config.DB_PORT,
      ssl: true,
      user: config.DB_USER
    });
  }
  return singletonPool;
};

export default getPool;
