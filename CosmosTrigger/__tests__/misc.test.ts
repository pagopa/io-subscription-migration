import * as O from "fp-ts/lib/Option";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createUpsertSql, parseOwnerIdFullPath } from "../handler";
import { MigrationRowDataTable } from "../../models/Domain";
import { IDecodableConfigPostgreSQL } from "../../utils/config";

describe("parseOwnerIdFullPath", () => {
  it("should parse valid owner Id full path", async () => {
    const fullPath = "" as NonEmptyString;
    const expected = "";
    const parsed = parseOwnerIdFullPath(fullPath);
    if (O.isSome(parsed)) {
      expect(parsed.value).toEqual(expected);
    } else {
      throw new Error("Expected some value, received none");
    }
  });
});

describe("createUpsertSql", () => {
  it("should compose correct upsert sql", async () => {
    const config = {
      DB_SCHEMA: "ServicesMigration",
      DB_TABLE: "Services"
    } as IDecodableConfigPostgreSQL;
    const data = ({
      subscriptionId: 1,
      organizationFiscalCode: "12345678901",
      sourceId: "01EYNPZXQJF9A2DBTH5GYB951V",
      sourceName: "source name",
      sourceSurname: "source surname",
      sourceEmail: "source email"
    } as unknown) as MigrationRowDataTable;
    const expected = `
    INSERT INTO "ServicesMigration"."Services"(
        "subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
        "sourceSurname", "sourceEmail")
        VALUES ('1', '12345678901', '01EYNPZXQJF9A2DBTH5GYB951V', 'source name', 'source surname', 'source email')
        ON CONFLICT ("subscriptionId")
        DO UPDATE
            SET "organizationFiscalCode" = "excluded"."organizationFiscalCode"
            WHERE "ServicesMigration"."Services"."status" <> 'PENDING'
    `;

    const sql = createUpsertSql(config)(data);

    expect(sql.trim()).toBe(expected.trim());
  });
});
