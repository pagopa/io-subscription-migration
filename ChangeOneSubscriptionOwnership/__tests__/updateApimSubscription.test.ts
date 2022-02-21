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

const mockApimSubscriptionUpdate = jest.fn(() =>
  Promise.resolve({
    ownerId:
      "/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/XXXXXXX/providers/Microsoft.ApiManagement/service/XXXXXXX/users/users/XXXXXXXXXXXXXXXXXXXXXXXXXX"
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
      "/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/XXXXXXX/providers/Microsoft.ApiManagement/service/XXXXXXX/users/XXXXXXXXXXXXXXXXXXXXXXXXXX" as NonEmptyString
    )();
    const expectedRes = {
      ownerId:
        "/subscriptions/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/resourceGroups/XXXXXXX/providers/Microsoft.ApiManagement/service/XXXXXXX/users/users/XXXXXXXXXXXXXXXXXXXXXXXXXX"
    };
    if (E.isRight(res)) {
      expect(res.right).toEqual(expectedRes);
    } else {
      fail("it fail to update subscription");
    }
  });
});
