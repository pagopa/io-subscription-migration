import { Email } from "../../generated/definitions/Email";
import { OrganizationDelegates } from "../../generated/definitions/OrganizationDelegates";
import * as E from "fp-ts/lib/Either";
describe("Array Delegates", () => {
  it("should validate a valid Delegates response", () => {
    const delegates: OrganizationDelegates = [
      {
        sourceId: "123",
        sourceName: "TestName",
        sourceSurname: "TestSurname",
        sourceEmail: "test@email.com" as Email
      }
    ];

    const res = OrganizationDelegates.decode(delegates);

    expect(E.isRight(res)).toBe(true);
  });
});
