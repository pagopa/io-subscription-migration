import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

// The shape of the item expected in the queue
export type ClaimOrganizationSubscriptions = t.TypeOf<
  typeof ClaimOrganizationSubscriptions
>;
export const ClaimOrganizationSubscriptions = t.interface({
  organizationFiscalCode: OrganizationFiscalCode,
  sourceId: NonEmptyString
});
