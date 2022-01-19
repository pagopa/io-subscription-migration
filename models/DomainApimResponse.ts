import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

const ApimUserResponseR = t.interface({
  id: NonEmptyString,
  firstName: NonEmptyString,
  lastName: NonEmptyString,
  email: EmailString,
});
const ApimUserResponseO = t.partial({});

export const ApimUserResponse = t.exact(
  t.intersection([ApimUserResponseR, ApimUserResponseO], "ApimUserResponse")
);
export type ApimUserResponse = t.TypeOf<typeof ApimUserResponse>;

const ApimSubscriptionResponseR = t.interface({
  subscriptionId: NonEmptyString,
  ownerId: NonEmptyString,
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
