import { ApiManagementClient } from "@azure/arm-apimanagement";
import { pipe } from "fp-ts/lib/function";
import { Pool } from "pg";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { initTelemetryClient } from "../utils/appinsight";
import { IConfig } from "../utils/config";
import { withJsonInput } from "../utils/misc";

import { IncomingQueueItem } from "./types";

export const createHandler = (
  _config: IConfig,
  _apimClient: ApiManagementClient,
  _client: Pool,
  _telemetryClient: ReturnType<typeof initTelemetryClient>
): Parameters<typeof withJsonInput>[0] =>
  withJsonInput(
    (context, item): Promise<void> => {
      const logPrefix = context.executionContext.functionName;
      return pipe(
        item,
        IncomingQueueItem.decode,
        E.mapLeft(failures => {
          const err = new Error(readableReport(failures));
          context.log(`${logPrefix}|Invalid incoming message: ${err.message}`);
          return err;
        }),
        TE.fromEither,
        TE.map(_ => void 0 /* we wxpect no return */),
        TE.getOrElse(err => {
          throw err;
        })
      )();
    }
  );
