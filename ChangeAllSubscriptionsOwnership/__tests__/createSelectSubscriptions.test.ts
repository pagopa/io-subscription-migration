import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";
import { IConfig } from "../../utils/config";
import { createSelectSubscriptions } from "../handler";

const mockDBConfig = {
  DB_SCHEMA: "Schema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString
};

describe("Generate Query string for get all subscriotions owned by sourceId belongs to an Organization", () => {
  it("should return a valid string as a select query", () => {
    const query = createSelectSubscriptions(mockDBConfig as IConfig)(
      "12345678901" as OrganizationFiscalCode,
      "123" as NonEmptyString,
      SubscriptionStatus.COMPLETED
    );
    const expected = `select "subscriptionId" from "Schema"."Table" where "organizationFiscalCode" = '12345678901' and "sourceId" = '123' and not "status" = 'COMPLETED'`;
    expect(query).toBe(expected);
  });
});
