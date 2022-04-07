import { Email } from "../../generated/definitions/Email";
import { OrganizationDelegates } from "../../generated/definitions/OrganizationDelegates";
import * as E from "fp-ts/lib/Either";
import { MigrationsStatus } from "../../generated/definitions/MigrationsStatus";
describe("Array Delegates", () => {
  it("should validate a valid Delegates response", () => {
    const delegates: OrganizationDelegates = [
      {
        sourceId: "123",
        sourceName: "TestName",
        sourceSurname: "TestSurname",
        sourceEmail: "test@email.com" as Email,
        subscriptionCounter: 1
      }
    ];

    const res = OrganizationDelegates.decode(delegates);

    expect(E.isRight(res)).toBe(true);
  });

  it("should validate a valid Latest Operation response", () => {
    const operations: MigrationsStatus = [
      {
        sourceEmail: "test@email.com" as Email,
        status: "PENDING"
      },
      {
        sourceEmail: "test@email.com" as Email,
        status: "COMPLETED"
      }
    ];

    const res = MigrationsStatus.decode(operations);

    expect(E.isRight(res)).toBe(true);
  });
});
