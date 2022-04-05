import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";
import { createHandler, createSqlStatus } from "../handler";

const mockDBConfig = {
  DB_HOST: "localhost" as NonEmptyString,
  DB_IDLE_TIMEOUT: 3000,
  DB_NAME: "test" as NonEmptyString,
  DB_PASSWORD: "psw" as NonEmptyString,
  DB_PORT: 5454,
  DB_SCHEMA: "TableSchema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString,
  DB_USER: "User" as NonEmptyString
};

describe("Create Handler Test", () => {
  it("should return a Reponse Error Internal", async () => {
    const handler = createHandler();

    const response = await handler();

    expect(response.kind).toBe("IResponseErrorInternal");
  });
});

describe("Create SQL Query", () => {
  it("should generate a valid SQL Query", () => {
    const expectedSql = `select distinct "t"."sourceEmail", "t"."status" from "TableSchema"."Table" as "t" inner join (select "sourceEmail", max("updateAt") as "latestOp" from "TableSchema"."Table" where "organizationFiscalCode" = '12345678901' and not "status" = 'INITIAL' group by "sourceEmail") as "x" on "x"."sourceEmail" = "t"."sourceEmail" and "latestOp" = "t"."updateAt"`;
    const sql = createSqlStatus(mockDBConfig)(
      "12345678901" as OrganizationFiscalCode,
      SubscriptionStatus.INITAL
    );

    expect(sql).toBe(expectedSql);
  });
});
