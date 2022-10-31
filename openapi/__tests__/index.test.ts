import { Email } from "../../generated/definitions/Email";
import { OrganizationDelegates } from "../../generated/definitions/OrganizationDelegates";
import * as E from "fp-ts/lib/Either";
import { LatestMigrationsResponse } from "../../generated/definitions/LatestMigrationsResponse";
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
    const operations = {
      items: [
        {
          delegate: {
            sourceId: "123",
            sourceName: "TestName",
            sourceSurname: "TestSurname",
            sourceEmail: "test@email.com" as Email
          },
          lastUpdate: new Date().toISOString(),
          status: { processing: 1, completed: 0, initial: 1, failed: 2 }
        },
        {
          delegate: {
            sourceId: "456",
            sourceName: "TestName2",
            sourceSurname: "TestSurname2",
            sourceEmail: "test@email.com" as Email
          },
          lastUpdate: new Date().toISOString(),
          status: { processing: 1, completed: 0, initial: 1, failed: 2 }
        }
      ]
    };

    const res = LatestMigrationsResponse.decode(operations);
    expect(E.isRight(res)).toBe(true);
  });
});
