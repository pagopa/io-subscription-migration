import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { createSqlDelegates } from "../handler";

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

describe("Create SQL for Delegates", () => {
  it("should generate a valid SQL", () => {
    const expectedSql = `select "sourceId", "sourceName", "sourceSurname", "sourceEmail", count("subscriptionId") as "subscriptionCounter" from "Schema"."Table" where "organizationFiscalCode" = '12345678901' and "hasBeenVisibleOnce" = true and "serviceName" not ilike '%deleted%' group by "sourceId", "sourceName", "sourceSurname", "sourceEmail"`;
    const sql = createSqlDelegates(mockDBConfig)(
      "12345678901" as OrganizationFiscalCode
    );
    expect(sql).toBe(expectedSql);
  });
});
