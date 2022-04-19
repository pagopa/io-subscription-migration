import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/lib/Either";
import { Pool, QueryResult } from "pg";
import { IConfig } from "../../utils/config";
import {
  LatestMigrationResultSet,
  getLatestMigrationByOrganizationFiscalCode
} from "../handler";

/*
This is a workaround to use Jest fail
https://github.com/facebook/jest/issues/11698
*/
function fail(reason = "fail was called in a test.") {
  throw new Error(reason);
}

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
const mockQueryResult: QueryResult<LatestMigrationResultSet> = {
  command: "SELECT",
  rowCount: 1,
  rows: [
    {
      sourceEmail: "source@email.com",
      status: "COMPLETED"
    }
  ]
} as QueryResult;
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};

describe("Select SQL for Latest Migration", () => {
  it("should return a valid data from query", async () => {
    const res = await getLatestMigrationByOrganizationFiscalCode(
      mockDBConfig as IConfig,
      (mockPool as unknown) as Pool
    )("12345678901" as OrganizationFiscalCode)();
    if (isRight(res)) {
      const decoded = LatestMigrationResultSet.decode(res.right);
      expect(isRight(decoded)).toBe(true);
      expect(res.right).toMatchObject({
        rowCount: 1,
        rows: [
          {
            sourceEmail: "source@email.com",
            status: "COMPLETED"
          }
        ]
      });
    } else {
      fail("it fail to get delegates");
    }
  });
});
