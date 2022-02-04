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

export const onProcessedDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (retrievedDocument: RetrievedService): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.processeddocument",
    properties: {
      difference: Math.floor(
        // Cosmos store ts in second so we need to translate in milliseconds
        // eslint-disable-next-line no-underscore-dangle
        new Date().getTime() - retrievedDocument._ts * 1000
      ),
      message: "Processed document",
      serviceId: retrievedDocument.serviceId
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};
