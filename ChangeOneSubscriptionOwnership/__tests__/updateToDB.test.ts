import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult } from "pg";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";
import { IConfig } from "../../utils/config";
import {
  updateSubscriptionStatusToDatabase,
  generateUpdateSQL
} from "../handler";
import * as E from "fp-ts/lib/Either";

/*
This is a workaround to use Jest fail
https://github.com/facebook/jest/issues/11698
*/
function fail(reason = "fail was called in a test.") {
  throw new Error(reason);
}

/*
 * Needs this two values to have a valid SQL with Schema and Table Name
 */
const mockConfig = ({
  DB_SCHEMA: "Schema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString
} as unknown) as IConfig;

const mockQueryResult = {
  command: "UPDATE",
  rowCount: 1
} as QueryResult;

const mockPool = ({
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
} as unknown) as Pool;

describe("Generate SQL for Subscription", () => {
  it("should generate a valid update query SQL for Subscription Status", () => {
    const expectedSql = `update "Schema"."Table" set "status" = 'COMPLETED' where "subscriptionId" = '12345678901'`;
    const sql = generateUpdateSQL(mockConfig)(
      "12345678901" as NonEmptyString,
      SubscriptionStatus.COMPLETED
    );
    expect(sql).toBe(expectedSql);
  });
});

describe("Update SQL for Subscription", () => {
  it("should update a Subscription Status", async () => {
    const expectedRes = { command: "UPDATE", rowCount: 1 };

    const res = await updateSubscriptionStatusToDatabase(mockConfig, mockPool)(
      "12345678901" as NonEmptyString,
      SubscriptionStatus.COMPLETED
    )();

    if (E.isRight(res)) {
      expect(res.right).toEqual(expectedRes);
    } else {
      fail("it fail to update a subscription");
    }
  });
});
