import { generateUpdateSubscriptionStatusSQL } from "../handler";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";

const mockDBConfig = {
  DB_HOST: "localhost" as NonEmptyString,
  DB_IDLE_TIMEOUT: 3000,
  DB_NAME: "test" as NonEmptyString,
  DB_PASSWORD: "psw" as NonEmptyString,
  DB_PORT: 5454,
  DB_SCHEMA: "Schema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString,
  DB_USER: "User" as NonEmptyString
};
describe("UpdateSqlSubscription", () => {
  it("should create a valid Update SQL Query", () => {
    const updateQuery = generateUpdateSubscriptionStatusSQL(mockDBConfig)(
      "01234567890" as OrganizationFiscalCode,
      "123" as NonEmptyString,
      SubscriptionStatus.PROCESSING
    );
    expect(updateQuery).toBe(
      `update "Schema"."Table" set "status" = 'PROCESSING' where "organizationFiscalCode" = '01234567890' and "hasBeenVisibleOnce" = true and "serviceName" not ilike '%deleted%' and "sourceId" = '123' and "status" != 'COMPLETED'`
    );
  });
});
