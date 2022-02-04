import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { initTelemetryClient } from "./appinsight";

export const onInvalidDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (d: unknown): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.oninvaliddocument",
    properties: {
      documentId: (d as RetrievedService).serviceId,
      message: "Invalid document received"
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

export const onIgnoredDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (d: unknown): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.onignoredocument",
    properties: {
      documentId: (d as RetrievedService).serviceId,
      message: "Ignore document"
    },
    tagOverrides: { samplingEnabled: "false" }
  });
  return void 0;
};
