import { IConfig } from "../../utils/config";
import { getTargetIdFromAPIM } from "../handler";
import { EmailString, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ApimDelegateUserResponse } from "../../models/DomainApimResponse";
import * as E from "fp-ts/lib/Either";

const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;
const mockApimOrganizationUserReponse = {
  id: mockOwnerId,
  firstName: "NomeOrganization" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString,
  note: "01234567891"
} as ApimDelegateUserResponse;
const mockApimUserGet = jest.fn(() =>
  Promise.resolve(mockApimOrganizationUserReponse)
);
const mockGetClient = () => ({
  user: {
    get: mockApimUserGet
  }
});
const mockApimClient = {
  getClient: mockGetClient
};
const mockConfig = ({} as unknown) as IConfig;
describe("getTargetIdFromAPIM", () => {
  it("should get a valid Organization for TargetId", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const res = await getTargetIdFromAPIM(
      mockConfig,
      apimClient,
      "00000000000000000000000000" as NonEmptyString
    )();
    if (E.isRight(res)) {
      expect(res.right).toMatchObject(mockApimOrganizationUserReponse);
      expect(res.right).toHaveProperty("kind", "organization");
    }
  });
});
