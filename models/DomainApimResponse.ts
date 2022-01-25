import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";
import { pipe } from "fp-ts/lib/function";

/**
 * Check data of a ApimUserResponse to parse if it's an Organization account.
 * By convention, we decided Organization accounts store the OrganizationFiscalCode as note
 * Thus, by parsing notes we can infer it's an Organization
 *
 * @param u
 * @returns
 */
const isOrganizationUser = (u: RawApimUserResponse): boolean =>
  pipe(u.note.trim(), OrganizationFiscalCode.decode, E.isRight);

type RawApimUserResponse = t.TypeOf<typeof RawApimUserResponse>;
const RawApimUserResponse = t.interface({
  email: EmailString,
  firstName: NonEmptyString,
  id: NonEmptyString,
  lastName: NonEmptyString,
  note: withDefault(t.string, "")
});

export type EnrichedApimUserResponse = t.TypeOf<
  typeof EnrichedApimUserResponse
>;
export const EnrichedApimUserResponse = new t.Type<
  RawApimUserResponse & { readonly kind: "organization" | "delegate" },
  RawApimUserResponse,
  RawApimUserResponse
>(
  "BaseApimUserResponse",
  (u): u is RawApimUserResponse & { readonly kind: "organization" } =>
    RawApimUserResponse.is(u) && isOrganizationUser(u),
  u =>
    t.success({
      ...u,
      kind: isOrganizationUser(u) ? "organization" : "delegate"
    }),
  RawApimUserResponse.encode
);

export type ApimDelegateUserResponse = t.TypeOf<
  typeof ApimDelegateUserResponse
>;
export const ApimDelegateUserResponse = t.intersection([
  RawApimUserResponse.pipe(EnrichedApimUserResponse),
  t.interface({ kind: t.literal("delegate") })
]);

export type ApimOrganizationUserResponse = t.TypeOf<
  typeof ApimOrganizationUserResponse
>;
export const ApimOrganizationUserResponse = t.intersection([
  RawApimUserResponse.pipe(EnrichedApimUserResponse),
  t.interface({ kind: t.literal("organization") })
]);

export type ApimUserResponse = t.TypeOf<typeof ApimUserResponse>;
export const ApimUserResponse = t.union([
  ApimDelegateUserResponse,
  ApimOrganizationUserResponse
]);

const ApimSubscriptionResponseR = t.interface({
  ownerId: NonEmptyString,
  subscriptionId: NonEmptyString
});
const ApimSubscriptionResponseO = t.partial({});

export const ApimSubscriptionResponse = t.exact(
  t.intersection(
    [ApimSubscriptionResponseR, ApimSubscriptionResponseO],
    "ApimSubscriptionResponse"
  )
);
export type ApimSubscriptionResponse = t.TypeOf<
  typeof ApimSubscriptionResponseR
>;
