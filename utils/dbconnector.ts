import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Pool } from "pg";
import { IDecodableConfigPostgreSQL } from "./config";

const pool = (
  db: {
    readonly name: NonEmptyString;
    readonly host: NonEmptyString;
    readonly port: number;
  },
  credentials: {
    readonly user: NonEmptyString;
    readonly password: NonEmptyString;
  },
  options: { readonly idleTimeout: number } = { idleTimeout: 30000 }
): Pool =>
  new Pool({
    database: db.name,
    host: db.host,
    idleTimeoutMillis: options.idleTimeout,
    max: 20,
    password: credentials.password,
    port: db.port,
    ssl: true,
    user: credentials.user
  });

export const clientDB = (config: IDecodableConfigPostgreSQL): Pool =>
  pool(
    {
      host: config.DB_HOST,
      name: config.DB_NAME,
      port: config.DB_PORT
    },
    {
      password: config.DB_PASSWORD,
      user: config.DB_USER
    },
    {
      idleTimeout: config.DB_IDLE_TIMEOUT
    }
  );

export default clientDB;
