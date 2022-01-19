import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Pool } from "pg";
import { IDecodableConfigPostgreSQL } from "./config";

const pool = (
  dbUser: NonEmptyString,
  dbPassword: NonEmptyString,
  dbHost: NonEmptyString,
  dbPort: NonEmptyString,
  dbDatabaseName: NonEmptyString,
  dbIdleTimeout: number = 30000
) =>
  new Pool({
    max: 20,
    connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}`,
    idleTimeoutMillis: dbIdleTimeout,
  });

// export default pool;

export const clientDB = async (config: IDecodableConfigPostgreSQL) =>
  await pool(
    config.DB_USER,
    config.DB_PASSWORD,
    config.DB_HOST,
    config.DB_PORT,
    config.DB_NAME
  );

export default clientDB;
