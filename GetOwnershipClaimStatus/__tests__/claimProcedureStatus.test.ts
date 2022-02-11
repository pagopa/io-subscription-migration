import { ClaimProcedureStatus } from "../../generated/definitions/ClaimProcedureStatus";
import { processResponseFromResultSet, ResultSet } from "../handler";
import * as E from "fp-ts/lib/Either";

const mockStatus = {
  completed: 1,
  failed: 0,
  initial: 0,
  processing: 0
};

const resultSetMock = {
  rowCount: 15,
  rows: [
    { status: "COMPLETED", count: "4" },
    { status: "INITIAL", count: "10" },
    { status: "PENDING", count: "1" }
  ]
};
describe("ClaimProcedureStatus Type Check", () => {
  it("should be a valid status with all fields with default value", () => {
    const queryRes = ClaimProcedureStatus.decode({
      completed: 1
    });
    if (E.isRight(queryRes)) {
      expect(queryRes.right).toEqual(mockStatus);
    }
  });

  it("should be a valid status with an empty response", () => {
    const queryRes = ClaimProcedureStatus.decode({ status: {} });
    expect(E.isRight(queryRes)).toBe(true);
    if (E.isRight(queryRes)) {
      expect(queryRes.right).toEqual({
        status: {
          completed: 0,
          failed: 0,
          initial: 0,
          processing: 0
        }
      });
    }
  });

  it("should not be a valid status with a null response", () => {
    const queryRes = ClaimProcedureStatus.decode(null);
    expect(E.isLeft(queryRes)).toBe(true);
  });
});

describe("processResponseFromResultSet", () => {
  it("should decode a valid ResultSet", () => {
    const dec = ResultSet.decode(resultSetMock);
    expect(E.isRight(dec)).toBe(true);
  });

  it("should process a valid response", async () => {
    const res = await processResponseFromResultSet(resultSetMock)();
    if (E.isRight(res)) {
      expect(res.right).toEqual({
        data: { COMPLETED: "4", INITIAL: "10", PENDING: "1" }
      });
    }
  });
});
