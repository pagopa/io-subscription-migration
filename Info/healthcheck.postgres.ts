import * as TE from "fp-ts/lib/TaskEither";

import {
  HealthCheck,
  ProblemSource,
  toHealthProblems
} from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { pipe } from "fp-ts/lib/function";
import { toError } from "fp-ts/lib/Either";
import clientDB from "../utils/dbconnector";
import { IDecodableConfigPostgreSQL } from "../utils/config";

const PostgresHealthCheck = (
  config: IDecodableConfigPostgreSQL
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error as HealthCheck type only allows a limited subset of problems, making health checks not extendable. We might want to fix it in the common module and then remove the annotation, thus the use of ts-expect-error instead of ts-ignore
): HealthCheck<"PostgresSQL"> =>
  pipe(
    TE.tryCatch(async () => {
      // just check it can connect and execute a simple query
      const pool = clientDB(config);
      await pool.query("SELECT NOW()");
      await pool.end();
    }, toError),
    TE.mapLeft(err => {
      // @ts-expect-error as HealthCheck type only allows a limited subset of problems, making health checks not extendable. We might want to fix it in the common module and then remove the annotation, thus the use of ts-expect-error instead of ts-ignore
      return toHealthProblems("PostgresSQL")(err.message);
    }),
    TE.map(_ => true)
  );

export default PostgresHealthCheck;
