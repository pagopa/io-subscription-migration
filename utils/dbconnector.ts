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
  // eslint-disable-next-line max-params
): Pool =>
  new Pool({
    connectionString: `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}`,
    idleTimeoutMillis: dbIdleTimeout,
    max: 20
  });

// export default pool;

export const clientDB = (config: IDecodableConfigPostgreSQL): Pool =>
  pool(
    config.DB_USER,
    config.DB_PASSWORD,
    config.DB_HOST,
    config.DB_PORT,
    config.DB_NAME
  );

export default clientDB;
