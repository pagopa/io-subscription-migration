import { Context } from "@azure/functions";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult } from "pg";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";
import { IConfig } from "../../utils/config";
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
const mockConfig = ({} as unknown) as IConfig;
const mockQueryResult = {
  command: "SELECT",
  rowCount: 0
} as QueryResult;
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};
const mockContext = {
  log: jest.fn(),
  executionContext: { functionName: jest.fn() }
};
describe("Create Handler Test", () => {
  it("should return a Reponse Error Internal", async () => {
    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );

    expect(response.kind).toBe("IResponseErrorInternal");
  });
});

describe("Create SQL Query", () => {
  it("should generate a valid SQL Query", () => {
    const expectedSql = `select "sourceId", "sourceName", "sourceSurname", "sourceEmail", sum(CASE WHEN "m"."status" = 'INITIAL' THEN 1 ELSE 0 END) as initial, sum(CASE WHEN "m"."status" = 'PROCESSING' THEN 1 ELSE 0 END) as processing, sum(CASE WHEN "m"."status" = 'FAILED' THEN 1 ELSE 0 END) as failed, sum(CASE WHEN "m"."status" = 'COMPLETED' THEN 1 ELSE 0 END) as completed from "TableSchema"."Table" as "m" where "organizationFiscalCode" = '12345678901' group by "sourceId", "sourceName", "sourceSurname", "sourceEmail"`;
    const sql = createSqlStatus(mockDBConfig)(
      "12345678901" as OrganizationFiscalCode
    );

    expect(sql).toBe(expectedSql);
  });
});
