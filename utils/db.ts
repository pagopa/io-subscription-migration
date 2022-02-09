import { flow, pipe } from "fp-ts/lib/function";
import { DatabaseError, Pool, QueryResult } from "pg";
import * as TE from "fp-ts/TaskEither";
import {
  IDbError,
  toPostgreSQLError,
  toPostgreSQLErrorMessage
} from "../models/DomainErrors";
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

export const queryDataTable = (
  pool: Pool,
  query: string
): TE.TaskEither<IDbError, QueryResult> =>
  pipe(
    TE.tryCatch(
      () => pool.query(query),
      error => error as DatabaseError
    ),
    TE.mapLeft(flow(toPostgreSQLErrorMessage, toPostgreSQLError))
  );

export default getPool;
