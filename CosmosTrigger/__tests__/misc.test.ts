import * as O from "fp-ts/lib/Option";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { createUpsertSql, parseOwnerIdFullPath } from "../handler";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import { MigrationRowDataTable } from "../../models/Domain";
import {
  ApimDelegateUserResponse,
  ApimOrganizationUserResponse,
  ApimUserResponse
} from "../../models/DomainApimResponse";
import { isRight } from "fp-ts/lib/Either";

describe("parseOwnerIdFullPath", () => {
  it("should return None for an empyy path", async () => {
    const fullPath = "" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return None for an invalid path", async () => {
    const fullPath = "This\\IsAnInvalid\\Path" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return None for a malformed path", async () => {
    const fullPath = "/subscriptions/subid/resourceGroups/providers/Microsoft.ApiManagement/service/users/5931a75ae4bbd512a88c680b" as NonEmptyString;
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isNone(parsed)).toBe(true);
  });
  it("should return Some for a valid path", async () => {
    const fullPath = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/5931a75ae4bbd512a88c680b" as NonEmptyString;
    const expected = "5931a75ae4bbd512a88c680b";
    const parsed = parseOwnerIdFullPath(fullPath);
    expect(O.isSome(parsed)).toBe(true);
    if (O.isSome(parsed)) {
      expect(parsed.value).toBe(expected);
    } else {
      throw new Error("Expected some value, received other");
    }
  });
});

describe("ApimOrganizationUserResponse", () => {
  it("should validate", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome",
      kind: "organization"
    };
    const res = ApimOrganizationUserResponse.decode(value);
    expect(isRight(res)).toBe(true);
  });
});

describe("ApimDelegateUserResponse", () => {
  it("should validate", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome",
      kind: "delegate"
    };
    const res = ApimDelegateUserResponse.decode(value);
    expect(isRight(res)).toBe(true);
  });
});

describe("ApimUserResponse", () => {
  it("should validate a delegate", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome"
    };
    const res = ApimUserResponse.decode(value);
    expect(isRight(res)).toBe(true);
  });
  it("should validate an organization", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome",
      note: "01234567891"
    };
    const res = ApimUserResponse.decode(value);
    expect(isRight(res)).toBe(true);
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
