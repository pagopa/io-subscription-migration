import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult } from "pg";
import { IConfig } from "../../utils/config";
import { getAllSubscriptionsAvailableToMigrate } from "../handler";
import * as E from "fp-ts/lib/Either";

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
const mockQueryResult = {
  command: "SELECT",
  rowCount: 3,
  rows: [
    {
      subscriptionId: "123"
    },
    {
      subscriptionId: "456"
    },
    {
      subscriptionId: "789"
    }
  ]
} as QueryResult;
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};

describe("getAllSubscriptionsAvailableToMigrate", () => {
  it("should return all subscriptions availate to migrate", async () => {
    const expectedRes = [
      { subscriptionId: "123" },
      { subscriptionId: "456" },
      { subscriptionId: "789" }
    ];
    const res = await getAllSubscriptionsAvailableToMigrate(
      mockDBConfig as IConfig,
      (mockPool as unknown) as Pool
    )("00000000000" as OrganizationFiscalCode, "000" as NonEmptyString)();
    if (E.isRight(res)) {
      expect(res.right).toHaveProperty("rowCount", 3);
      expect(res.right).toHaveProperty("rows", expectedRes);
    } else {
      fail("it fail to get a subscriptions available");
    }
  });
});
