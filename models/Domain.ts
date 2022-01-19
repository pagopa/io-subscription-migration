import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import {
  ApimSubscriptionResponse,
  ApimUserResponse,
} from "./DomainApimResponse";

export const OwnerData = t.intersection(
  [ApimSubscriptionResponse, ApimUserResponse],
  "OwnerData"
);
export type OwnerData = t.TypeOf<typeof OwnerData>;

const MigrationRowDataTableR = t.interface({
  subscriptionId: NonEmptyString,
  ownerId: NonEmptyString,
  organizationFiscalCode: OrganizationFiscalCode,
  firstName: NonEmptyString,
  lastName: NonEmptyString,
  email: EmailString,
});
const MigrationRowDataTableO = t.partial({});

export const MigrationRowDataTable = t.exact(
  t.intersection(
    [MigrationRowDataTableR, MigrationRowDataTableO],
    "MigrationRowDataTable"
  )
);
export type MigrationRowDataTable = t.TypeOf<typeof MigrationRowDataTable>;
