/* eslint-disable no-console */
import { Context } from "@azure/functions";
import { flow, pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { initTelemetryClient } from "../utils/appinsight";
import {
  trackIncomingServiceDocumentBatch,
  trackInvalidIncomingDocument,
  trackPeindingIncomingDocument
} from "../utils/tracking";
import { IncomingQueueItem as UpsertSubscriptionQueueItem } from "../UpsertSubscriptionToMigrate/types";

// Incoming documents are expected to be of kind RetrievedService
const validateDocument = RetrievedService.decode;

export const createServiceChangeHandler = (
  telemetryClient: ReturnType<typeof initTelemetryClient>
) => async (context: Context, documents: unknown): Promise<void> =>
  pipe(
    // is documents always an array? We assume it can be something else
    Array.isArray(documents) ? documents : [documents],
    d => {
      trackIncomingServiceDocumentBatch(telemetryClient)(
        d,
        context.executionContext.retryContext
      );
      return d;
    },
    // Validate each document
    RA.map(
      flow(
        validateDocument,
        E.mapLeft(err => {
          const reason = readableReport(err);
          trackInvalidIncomingDocument(telemetryClient)(document, reason);
          return err;
        })
      )
    ),
    // dispatch every single valid document into a separate job message
    RA.filter(E.isRight),
    items => {
      pipe(
        items,
        RA.map(({ right: service }) =>
          UpsertSubscriptionQueueItem.encode({ service })
        ),
        RA.map(JSON.stringify),
        // eslint-disable-next-line functional/immutable-data
        batch => (context.bindings.incomingSubscriptions = batch)
      );
      return items;
    },
    // finally, trace an event for each dispatched item
    RA.map(({ right: service }) =>
      trackPeindingIncomingDocument(telemetryClient)(service)
    ),
    _ => void 0
  );
