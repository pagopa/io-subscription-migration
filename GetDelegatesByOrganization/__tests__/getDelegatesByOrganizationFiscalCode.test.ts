import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { isRight } from "fp-ts/lib/Either";
import { Pool, QueryResult } from "pg";
import { IConfig } from "../../utils/config";
import {
  DelegatesResultSet,
  getDelegatesByOrganizationFiscalCode
} from "../handler";

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
const mockQueryResult = {
  command: "SELECT",
  rowCount: 1,
  rows: [
    {
      sourceEmail: "source@email.com",
      sourceId: "123",
      sourceName: "sourceName",
      sourceSurname: "sourceLastName",
      subscriptionCounter: "1"
    }
  ]
} as QueryResult;
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};

describe("Select SQL for Delegates", () => {
  it("should return a valid data from query", async () => {
    const res = await getDelegatesByOrganizationFiscalCode(
      mockDBConfig as IConfig,
      (mockPool as unknown) as Pool
    )("12345678901" as OrganizationFiscalCode)();
    if (isRight(res)) {
      const decoded = DelegatesResultSet.decode(res.right);
      expect(isRight(decoded)).toBe(true);
      expect(res.right).toMatchObject({
        rowCount: 1,
        rows: [
          {
            sourceEmail: "source@email.com",
            sourceId: "123",
            sourceName: "sourceName",
            sourceSurname: "sourceLastName",
            subscriptionCounter: "1"
          }
        ]
      });
    }
  });
});
