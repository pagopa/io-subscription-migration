import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";
import {
  ApimSubscriptionResponse,
  ApimUserResponse
} from "./DomainApimResponse";

export type OwnerData = t.TypeOf<typeof OwnerData>;
export const OwnerData = t.intersection(
  [ApimSubscriptionResponse, ApimUserResponse],
  "OwnerData"
);

export type MigrationRowDataTable = t.TypeOf<typeof MigrationRowDataTable>;
export const MigrationRowDataTable = t.interface({
  hasBeenBooleanOnce: t.boolean,
  isVisible: t.boolean,
  organizationFiscalCode: OrganizationFiscalCode,
  serviceName: t.string,
  serviceVersion: t.number,
  sourceEmail: EmailString,
  sourceId: NonEmptyString,
  sourceName: NonEmptyString,
  sourceSurname: NonEmptyString,
  subscriptionId: NonEmptyString
});
