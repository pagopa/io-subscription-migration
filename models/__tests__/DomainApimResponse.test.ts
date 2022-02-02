import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/lib/Either";
import {
  ApimDelegateUserResponse,
  ApimOrganizationUserResponse
} from "../DomainApimResponse";
const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;
describe("RawApimUserResponse", () => {
  it("should decode a valid raw user to a valid delegate user", () => {
    const rawData = {
      email: "email@test.test",
      firstName: "FirstName Test",
      id: mockOwnerId,
      lastName: "Last Name Test",
      note: ""
    };

    const res = ApimDelegateUserResponse.decode(rawData);
    console.log(res);
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
      expect(res.right).toHaveProperty("kind", "delegate");
    }
  });

  it("should decode a valid raw user to a valid organization user", () => {
    const rawData = {
      email: "email@test.test",
      firstName: "FirstName Test",
      id: mockOwnerId,
      lastName: "Last Name Test",
      note: "00000000000"
    };

    const res = ApimOrganizationUserResponse.decode(rawData);
    console.log(res);
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
      expect(res.right).toHaveProperty("kind", "organization");
    }
  });
});
