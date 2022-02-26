import {
  ApiManagementClient,
  SubscriptionUpdateResponse
} from "@azure/arm-apimanagement";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { IDecodableConfigAPIM } from "../../utils/config";
import { updateApimSubscription } from "../handler";
import * as E from "fp-ts/lib/Either";

/*
This is a workaround to use Jest fail
https://github.com/facebook/jest/issues/11698
*/
function fail(reason = "fail was called in a test.") {
  throw new Error(reason);
}

const mockOwnerId =
  "/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/XXXXXXX/providers/Microsoft.ApiManagement/service/XXXXXXX/users/XXXXXXXXXXXXXXXXXXXXXXXXXX";
const mockApimSubscriptionUpdate = jest.fn(() =>
  Promise.resolve({
    ownerId: mockOwnerId
  } as SubscriptionUpdateResponse)
);
const mockGetClient = () => ({
  subscription: {
    update: mockApimSubscriptionUpdate
  }
});
const mockApimClient = {
  getClient: mockGetClient
};

const mockConfig = {} as IDecodableConfigAPIM;

describe("updateApimSubscription", () => {
  it("should update a subscription", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const res = await updateApimSubscription(mockConfig, apimClient)(
      "XXXXXXXXXXXXXXXXXXXXXXXXXX" as NonEmptyString,
      mockOwnerId as NonEmptyString
    )();
    const expectedRes = {
      ownerId: mockOwnerId
    };
    console.log(res);
    if (E.isRight(res)) {
      expect(res.right).toEqual(expectedRes);
    } else {
      fail("it fail to update subscription");
    }
  });
});
