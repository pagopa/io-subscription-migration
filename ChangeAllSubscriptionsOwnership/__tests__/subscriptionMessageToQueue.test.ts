import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { subscriptionMessageToQueue } from "../handler";

const mockSubscriptionId = "123" as NonEmptyString;
const mockTargetId = "000" as NonEmptyString;
describe("subscriptionMessageToQueue", () => {
  it("should create a valid JSON stringify structure for queue message", () => {
    const expectedMessage = JSON.stringify({
      subscriptionId: "123",
      targetId: "000"
    });
    const message = subscriptionMessageToQueue(
      mockSubscriptionId,
      mockTargetId
    );
    expect(message).toEqual(expectedMessage);
  });
});
