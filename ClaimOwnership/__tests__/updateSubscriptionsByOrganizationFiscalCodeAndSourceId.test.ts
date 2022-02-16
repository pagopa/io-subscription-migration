import { updateSubscriptionsByOrganizationFiscalCodeAndSourceId } from "../handler";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult } from "pg";
import { IConfig } from "../../utils/config";
import * as E from "fp-ts/lib/Either";

const mockDBConfig = {
  DB_HOST: "localhost" as NonEmptyString,
  DB_IDLE_TIMEOUT: 3000,
  DB_NAME: "test" as NonEmptyString,
  DB_PASSWORD: "psw" as NonEmptyString,
  DB_PORT: 5454,
  DB_SCHEMA: "Schema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString,
  DB_USER: "User" as NonEmptyString
} as IConfig;
const mockQueryResult = {
  command: "UPDATE",
  rowCount: 1
} as QueryResult;
const mockPool = ({
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
} as unknown) as Pool;
describe("UpdateSqlSubscription", () => {
  it("should create a valid Update SQL Query", async () => {
    const res = await updateSubscriptionsByOrganizationFiscalCodeAndSourceId(
      mockDBConfig,
      mockPool
    )("01234567890" as OrganizationFiscalCode, "123" as NonEmptyString)();
    if (E.isRight(res)) {
      expect(res.right.rowCount).toEqual(1);
    }
  });
});
