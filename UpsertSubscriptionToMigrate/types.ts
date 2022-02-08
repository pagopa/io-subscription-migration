import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import * as t from "io-ts";

// The shape of the item expected in the queue
export type IncomingQueueItem = t.TypeOf<typeof IncomingQueueItem>;
export const IncomingQueueItem = t.interface({
  service: RetrievedService
});
