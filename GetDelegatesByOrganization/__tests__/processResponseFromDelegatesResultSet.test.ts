import { isRight } from "fp-ts/lib/Either";
import { QueryResult } from "pg";
import { processResponseFromDelegatesResultSet } from "../handler";

/*
This is a workaround to use Jest fail
https://github.com/facebook/jest/issues/11698
*/
function fail(reason = "fail was called in a test.") {
  throw new Error(reason);
}

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

describe("Process ResultSet for Delegates", () => {
  it("should generate a valid response data", async () => {
    const res = await processResponseFromDelegatesResultSet(mockQueryResult)();
    if (isRight(res)) {
      expect(res.right.value).toEqual({
        delegates: [
          {
            sourceEmail: "source@email.com",
            sourceId: "123",
            sourceName: "sourceName",
            sourceSurname: "sourceLastName",
            subscriptionCounter: 1
          }
        ]
      });
    } else {
      fail("it fail to decode");
    }
  });
});
