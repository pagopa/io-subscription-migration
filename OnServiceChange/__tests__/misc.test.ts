import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import {
  createUpsertSql,
  parseOwnerIdFullPath,
  validateDocument
} from "../handler";
import { IDecodableConfigPostgreSQL } from "../../utils/config";
import { MigrationRowDataTable } from "../../models/Domain";
import {
  ApimDelegateUserResponse,
  ApimOrganizationUserResponse,
  ApimUserResponse
} from "../../models/DomainApimResponse";
import { isRight } from "fp-ts/lib/Either";

describe("validate Document", () => {
  it("should validate a valid document", () => {
    const doc = {
      serviceId: "01EYNQ0864HKYR1Q9PXPJ18W7G",
      serviceName: "Lorenzo",
      version: 0,
      organizationFiscalCode: "00000000000",
      id: "23550680-0707-46bb-9592-e433ee43bada",
      _rid: "DBFFAKatTgwBAAAAAAAAAA==",
      _self: "dbs/DBFFAA==/colls/DBFFAKatTgw=/docs/DBFFAKatTgwBAAAAAAAAAA==/",
      _etag: '"00000000-0000-0000-1379-0f69200201d8"',
      _attachments: "attachments/",
      _ts: 1643286367
    };
    const res = validateDocument(doc);
    expect(E.isRight(res)).toBe(true);
  });
});
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
  it("should validate a valid Organization User", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome",
      note: "01234567891"
    };

    expect(isRight(ApimOrganizationUserResponse.decode(value))).toBe(true);
    expect(ApimOrganizationUserResponse.is(value)).toBe(true);
  });
  it("should not validate as valid Delegate User", () => {
    const value = {
      email: "email@test.com",
      firstName: "TestNome",
      id: "123",
      lastName: "TestCognome",
      note: "01234567891"
    };
    expect(isRight(ApimDelegateUserResponse.decode(value))).toBe(false);
    expect(ApimDelegateUserResponse.is(value)).toBe(false);
  });
});

describe("ApimDelegateUserResponse", () => {
  it("should validate a valid Delegate User", () => {
    const value = {
      id:
        "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/01EYNPZXQJF9A2DBTH5GYB951V",
      firstName: "Nome",
      lastName: "Cognome",
      email: "email@test.com",
      note: ""
    };

    expect(isRight(ApimDelegateUserResponse.decode(value))).toBe(true);
    expect(ApimDelegateUserResponse.is(value)).toBe(true);
  });
  it("sould not validate as a valide Organization", () => {
    const value = {
      id:
        "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/01EYNPZXQJF9A2DBTH5GYB951V",
      firstName: "Nome",
      lastName: "Cognome",
      email: "email@test.com",
      note: ""
    };
    expect(isRight(ApimOrganizationUserResponse.decode(value))).toBe(false);
    expect(ApimOrganizationUserResponse.is(value)).toBe(false);
  });
});

describe("ApimUserResponse", () => {
  it("should validate a valid User", () => {
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
      sourceEmail: "source email",
      serviceVersion: 0,
      serviceName: "Service Test"
    } as unknown) as MigrationRowDataTable;
    const expected = `
    INSERT INTO "ServicesMigration"."Services"(
        "subscriptionId", "organizationFiscalCode", "sourceId", "sourceName",
        "sourceSurname", "sourceEmail", "serviceVersion", "serviceName")
        VALUES ('1', '12345678901', '01EYNPZXQJF9A2DBTH5GYB951V', 'source name', 'source surname', 'source email', '0', 'Service Test')
        ON CONFLICT ("subscriptionId")
        DO UPDATE
            SET "organizationFiscalCode" = "excluded"."organizationFiscalCode",
            "serviceVersion" = "excluded"."serviceVersion",
            "serviceName" = "excluded"."serviceName"
            WHERE "ServicesMigration"."Services"."status" <> 'PENDING'
            AND "ServicesMigration"."Services"."serviceVersion" < "excluded"."serviceVersion"
    `;

    const sql = createUpsertSql(config)(data);

    expect(sql.trim()).toBe(expected.trim());
  });
});
