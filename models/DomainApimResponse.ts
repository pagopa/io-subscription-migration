import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as t from "io-ts";
import { identity, pipe } from "fp-ts/lib/function";

/**
 * Check data of a ApimUserResponse to parse if it's an Organization account.
 * By convention, we decided Organization accounts store the OrganizationFiscalCode as note
 * Thus, by parsing notes we can infer it's an Organization
 *
 * @param u
 * @returns
 */
const isOrganizationUser = (u: RawApimUserResponse): boolean =>
  pipe(
    u,
    E.fromPredicate(
      () => u.note !== undefined,
      () => E.toError
    ),
    E.map(() => pipe(u.note.trim(), OrganizationFiscalCode.decode, E.isRight)),
    E.mapLeft(() => false),
    E.fold(() => false, identity)
  );

export type RawApimUserResponse = t.TypeOf<typeof RawApimUserResponse>;
export const RawApimUserResponse = t.interface({
  email: EmailString,
  firstName: NonEmptyString,
  id: NonEmptyString,
  lastName: NonEmptyString,
  note: withDefault(t.string, "")
});

export type ApimDelegateUserResponse = t.TypeOf<
  typeof ApimDelegateUserResponse
>;
export const ApimDelegateUserResponse = new t.Type<
  RawApimUserResponse & { readonly kind: "delegate" },
  RawApimUserResponse,
  unknown
>(
  "ApimDelegateUserResponse",
  (u): u is RawApimUserResponse & { readonly kind: "delegate" } =>
    RawApimUserResponse.is(u) && !isOrganizationUser(u),
  (u, c) => {
    const maybeRaw = RawApimUserResponse.decode(u);
    if (E.isLeft(maybeRaw)) {
      return t.failure(u, c);
    }
    return !isOrganizationUser(maybeRaw.right)
      ? t.success({
          ...maybeRaw.right,
          kind: "delegate" as const
        })
      : t.failure(u, c);
  },
  RawApimUserResponse.encode
);

export type ApimOrganizationUserResponse = t.TypeOf<
  typeof ApimOrganizationUserResponse
>;
export const ApimOrganizationUserResponse = new t.Type<
  RawApimUserResponse & { readonly kind: "organization" },
  RawApimUserResponse,
  unknown
>(
  "ApimOrganizationUserResponse",
  (u): u is RawApimUserResponse & { readonly kind: "organization" } =>
    RawApimUserResponse.is(u) && isOrganizationUser(u),
  (u, c) => {
    const maybeRaw = RawApimUserResponse.decode(u);
    if (E.isLeft(maybeRaw)) {
      return t.failure(u, c);
    }
    return isOrganizationUser(maybeRaw.right)
      ? t.success({
          ...maybeRaw.right,
          kind: "organization" as const
        })
      : t.failure(u, c);
  },
  RawApimUserResponse.encode
);

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
