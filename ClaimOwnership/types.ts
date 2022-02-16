import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

// The shape of the item expected in the queue
export type OrganizationQueueItem = t.TypeOf<typeof OrganizationQueueItem>;
export const OrganizationQueueItem = t.interface({
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString,
  targetId: NonEmptyString
});
