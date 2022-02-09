import { Result } from "../handler";
import * as E from "fp-ts/Either";
describe("", () =>
  it("should decode", () => {
    const data: unknown = {
      command: "SELECT",
      rowCount: 10,
      rows: [
        {
          status: "INITIAL",
          count: "1"
        }
      ]
    };
    const res = Result.decode(data);
    console.log(res);
    expect(E.isRight(res)).toBe(true);
  }));
