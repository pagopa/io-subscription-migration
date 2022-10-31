import { ClaimProcedureStatus } from "../../generated/definitions/ClaimProcedureStatus";
import { createSql, processResponseFromResultSet } from "../handler";
import * as E from "fp-ts/lib/Either";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { ResultSet } from "../../utils/db";

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
      expect(res.right.value).toEqual({
        data: { COMPLETED: "4", INITIAL: "10", PENDING: "1" }
      });
    }
  });
});

describe("createSql", () => {
  it("should create a valid string with query", () => {
    const res = createSql(mockDBConfig as IDecodableConfigPostgreSQL)(
      "12345678901" as OrganizationFiscalCode,
      "999" as NonEmptyString
    );

    expect(res).toBe(
      `select "status", count("status") from "Schema"."Table" where "organizationFiscalCode" = '12345678901' and "hasBeenVisibleOnce" = true and "serviceName" not ilike '%deleted%' and "sourceId" = '999' group by "status"`
    );
  });
});
