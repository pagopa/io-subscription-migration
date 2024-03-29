import { RetryContext } from "@azure/functions";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { DatabaseError } from "pg";
import { initTelemetryClient } from "./appinsight";

const eventName = (name: string): string =>
  `selfcare.subsmigrations.services.${name}`;

/**
 * Track when an incoming service document is invalid
 *
 * @param telemetryClient
 * @returns
 */
export const trackInvalidIncomingDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  d: unknown = {} /** default empty object to prevent nullish values */,
  reason: string = ""
): void => {
  telemetryClient.trackEvent({
    name: eventName(`invalid-incoming-document`),
    properties: {
      documentId: (d as RetrievedService).id,
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
  d: unknown = {} /** default empty object to prevent nullish values */,
  reason: string = ""
): void => {
  telemetryClient.trackEvent({
    name: eventName(`ignored-incoming-document`),
    properties: {
      documentId: (d as RetrievedService).id,
      reason
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
    name: eventName(`processed-service`),
    properties: {
      documentId: retrievedDocument.id,
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

/**
 * Track when a Service document processing fails
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailedQueryOnDocumentProcessing = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (retrievedDocument: RetrievedService, error: DatabaseError): void => {
  telemetryClient.trackEvent({
    name: eventName(`processed-service.failed-query-on-document-processing`),
    properties: {
      documentId: retrievedDocument.id,
      errorMessage: error.message,
      hint: error.hint,
      query: error.internalQuery,
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

/**
 * Track when a Service document is migrated to a targetId
 *
 * @param telemetryClient
 * @returns
 */
export const trackMigratedServiceDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (serviceId: NonEmptyString, targetId: NonEmptyString): void => {
  telemetryClient.trackEvent({
    name: eventName(`migrated-service`),
    properties: {
      serviceId,
      targetId
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when a Service document is failed to migrated to a targetId
 *
 * @param telemetryClient
 * @returns
 */
export const trackFailedMigrationServiceDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (serviceId: NonEmptyString, targetId: NonEmptyString): void => {
  telemetryClient.trackEvent({
    name: eventName(`fail-migrated-service`),
    properties: {
      serviceId,
      targetId
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when a batch of Service Documents arrive from the db change feed
 *
 * @param telemetryClient
 * @returns
 */
export const trackIncomingServiceDocumentBatch = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (
  documents: ReadonlyArray<unknown>,
  retryContext: RetryContext | null
): void => {
  telemetryClient.trackEvent({
    name: eventName(`incoming-service-documents-batch`),
    properties: {
      batchSize: documents.length,
      retryContext
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};

/**
 * Track when a Service document is enqueued to be processed
 *
 * @param telemetryClient
 * @returns
 */
export const trackPeindingIncomingDocument = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => (retrievedDocument: RetrievedService): void => {
  telemetryClient.trackEvent({
    name: eventName(`pending-incoming-document`),
    properties: {
      documentId: retrievedDocument.id,
      serviceId: retrievedDocument.serviceId
    },
    tagOverrides: { samplingEnabled: "false" }
  });
};
