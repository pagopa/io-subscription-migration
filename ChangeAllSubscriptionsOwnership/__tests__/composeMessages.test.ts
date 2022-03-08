import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { composeMessages, SubscriptionResultRow } from "../handler";

const mockSubscriptionsId: ReadonlyArray<SubscriptionResultRow> = [
  {
    subscriptionId: "1234" as NonEmptyString
  },
  {
    subscriptionId: "3456" as NonEmptyString
  },
  {
    subscriptionId: "7890" as NonEmptyString
  }
];

const mockTargetId = "000000000" as NonEmptyString;

describe("composeMessages", () => {
  it("should receive an array of message and compost it", () => {
    const expectedMessages = [
      '{"subscriptionId":"1234","targetId":"000000000"}',
      '{"subscriptionId":"3456","targetId":"000000000"}',
      '{"subscriptionId":"7890","targetId":"000000000"}'
    ];
    const messages = composeMessages(mockSubscriptionsId, mockTargetId);
    expect(messages).toEqual(expectedMessages);
  });
});
