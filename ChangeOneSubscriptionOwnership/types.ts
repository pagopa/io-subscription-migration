import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

// The shape of the item expected in the queue
export type ClaimSubscriptionItem = t.TypeOf<typeof ClaimSubscriptionItem>;
export const ClaimSubscriptionItem = t.interface({
  subscriptionId: NonEmptyString,
  targetId: NonEmptyString
});
