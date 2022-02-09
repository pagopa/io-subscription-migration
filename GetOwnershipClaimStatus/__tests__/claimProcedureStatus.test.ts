import { ClaimProcedureStatus } from "../../generated/definitions/ClaimProcedureStatus";
import * as E from "fp-ts/lib/Either";

const mockStatus = {
  completed: 1,
  failed: 0,
  initial: 0,
  processing: 0
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
    const queryRes = ClaimProcedureStatus.decode({});
    expect(E.isRight(queryRes)).toBe(true);
    if (E.isRight(queryRes)) {
      expect(queryRes.right).toEqual({
        completed: 0,
        failed: 0,
        initial: 0,
        processing: 0
      });
    }
  });

  it("should not be a valid status with a null response", () => {
    const queryRes = ClaimProcedureStatus.decode(null);
    expect(E.isLeft(queryRes)).toBe(true);
  });
});
