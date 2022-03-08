import { getConfigOrThrow, IConfig } from "../../utils/config";
import { getTargetIdFromAPIM } from "../handler";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { ApiManagementClient, UserContract } from "@azure/arm-apimanagement";
import { ApimOrganizationUserResponse } from "../../models/DomainApimResponse";
import * as E from "fp-ts/lib/Either";

/*
This is a workaround to use Jest fail
https://github.com/facebook/jest/issues/11698
*/
function fail(reason = "fail was called in a test.") {
  throw new Error(reason);
}

/*
 * This function make an iterator with a raw user get from APIM
 */
function* makePagedAsyncIterableIterator() {
  yield {
    email: "email@test.test",
    firstName: "FirstName Test",
    id: "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString,
    lastName: "Last Name Test",
    note: "00000000000"
  } as ApimOrganizationUserResponse;
}

// This need to return a valid UserContract structure and need to be an iterator with Organization UserContract
const mockGetClient = () => ({
  user: {
    listByService: jest.fn(makePagedAsyncIterableIterator)
  }
});

const mockApimClient = {
  getClient: mockGetClient
};

describe("getTargetIdFromAPIM", () => {
  it("should get a valid User from TargetId", async () => {
    const expectedUser = {
      email: "email@test.test",
      firstName: "FirstName Test",
      id:
        "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000",
      lastName: "Last Name Test",
      note: "00000000000",
      kind: "organization"
    };
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const res = await getTargetIdFromAPIM(
      {} as IConfig,
      apimClient
    )("00000000000" as OrganizationFiscalCode)();
    if (E.isRight(res)) {
      expect(res.right).toEqual(expectedUser);
    } else {
      fail("it fail to get a valid Organization user from APIM");
    }
  });
});
