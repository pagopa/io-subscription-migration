/* eslint-disable prettier/prettier */
import {
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

const RetrievedServiceDocumentR = t.interface({
  organizationFiscalCode: OrganizationFiscalCode,
  subscriptionId: NonEmptyString,
});
const RetrievedServiceDocumentO = t.partial({
  serviceName: NonEmptyString,
});

export const RetrievedServiceDocument = t.exact(
  t.intersection(
    [RetrievedServiceDocumentR, RetrievedServiceDocumentO],
    "RetrievedServiceDocument"
  )
);
export type RetrievedServiceDocument = t.TypeOf<
  typeof RetrievedServiceDocument
>;
