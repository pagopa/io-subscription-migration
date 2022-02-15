import * as TE from "fp-ts/lib/TaskEither";

import {
  HealthCheck,
  toHealthProblems
} from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { pipe } from "fp-ts/lib/function";
import { toError } from "fp-ts/lib/Either";
import getPool from "../utils/db";
import { IDecodableConfigPostgreSQL } from "../utils/config";

const postgresHealthCheck = (
  config: IDecodableConfigPostgreSQL
): HealthCheck<"PostgresSQL"> =>
  pipe(
    TE.tryCatch(async () => {
      // just check it can connect and execute a simple query
      const pool = getPool(config);
      await pool.query("SELECT NOW()");
    }, toError),
    TE.mapLeft(err => toHealthProblems("PostgresSQL")(err.message)),
    TE.map(_ => true)
  );

export default postgresHealthCheck;
