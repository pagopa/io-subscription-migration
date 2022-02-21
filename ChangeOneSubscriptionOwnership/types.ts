import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

// The shape of the item expected in the queue
export type SubscriptionQueueItem = t.TypeOf<typeof SubscriptionQueueItem>;
export const SubscriptionQueueItem = t.interface({
  subscriptionId: NonEmptyString,
  targetId: NonEmptyString
});
