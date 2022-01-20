/* eslint-disable max-params */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable sort-keys */
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
    // eslint-disable-next-line prettier/prettier
    idleTimeoutMillis: dbIdleTimeout,
  });

// export default pool;

export const clientDB = (config: IDecodableConfigPostgreSQL) =>
  pool(
    config.DB_USER,
    config.DB_PASSWORD,
    config.DB_HOST,
    config.DB_PORT,
    config.DB_NAME
  );

export default clientDB;
