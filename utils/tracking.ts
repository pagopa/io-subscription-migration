import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { initTelemetryClient } from "./appinsight";

/**
 * Track when an incoming service document is invalid
 *
 * @param telemetryClient
 * @returns
 */
export const trackIgnoredInvalidIncomingDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  d: unknown = {} /** default empty object to prevent nullish values */,
  reason: string = ""
): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.invalid-incoming-document",
    properties: {
      documentId: (d as RetrievedService).id,
      message: "Invalid document received",
      reason
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when an incoming service document is ignored for any reason
 *
 * @param telemetryClient
 * @returns
 */
export const trackIgnoredIncomingDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  d: unknown = {} /** default empty object to prevent nullish values */
): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.ignored-incoming-document",
    properties: {
      documentId: (d as RetrievedService).id,
      message: "Ignore document"
    },
    tagOverrides: { samplingEnabled: "false" }
  });
  return void 0;
};

/**
 * Track when a Service document is processed
 *
 * @param telemetryClient
 * @returns
 */
export const trackProcessedServiceDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (retrievedDocument: RetrievedService): void => {
  telemetryClient.trackEvent({
    name: "selfcare.subsmigrations.services.processed-service",
    properties: {
      documentId: retrievedDocument.id,
      message: "Processed document",
      serviceId: retrievedDocument.serviceId,
      // the time elapsed between when the doc has been created and when it has been processed
      timeDifference: Math.floor(
        // Cosmos store ts in second so we need to translate in milliseconds
        // eslint-disable-next-line no-underscore-dangle
        Date.now() - retrievedDocument._ts * 1000
      )
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};
