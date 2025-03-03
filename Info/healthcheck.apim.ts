import * as TE from "fp-ts/lib/TaskEither";

import {
  HealthCheck,
  toHealthProblems
} from "@pagopa/io-functions-commons/dist/src/utils/healthcheck";
import { pipe } from "fp-ts/lib/function";
import { toError } from "fp-ts/lib/Either";
import { IDecodableConfigAPIM } from "../utils/config";
import { getApiClient } from "../utils/apim";

const apimHealthCheck = (config: IDecodableConfigAPIM): HealthCheck<"APIM"> =>
  pipe(
    TE.tryCatch(async () => {
      const apimClient = getApiClient(config.APIM_SUBSCRIPTION_ID);
      await apimClient.apiManagementService.get(
        config.APIM_RESOURCE_GROUP,
        config.APIM_SERVICE_NAME
      );
    }, toError),
    TE.mapLeft(err => toHealthProblems("APIM")(err.message)),
    TE.map(_ => true)
  );

export default apimHealthCheck;
