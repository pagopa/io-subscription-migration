import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
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
import {
  RetrievedService,
  toAuthorizedCIDRs,
  toAuthorizedRecipients
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  IWithinRangeIntegerTag,
  NonNegativeInteger
} from "@pagopa/ts-commons/lib/numbers";

describe("validate Document", () => {
  it("should validate a valid document", () => {
    const doc: RetrievedService = {
      authorizedCIDRs: toAuthorizedCIDRs([]),
      authorizedRecipients: toAuthorizedRecipients([]),
      departmentName: "MyDeptName" as NonEmptyString,
      isVisible: true,
      maxAllowedPaymentAmount: 0 as
        | 9999999999
        | (number & IWithinRangeIntegerTag<0, 9999999999>),
      organizationFiscalCode: "00000000000" as OrganizationFiscalCode,
      organizationName: "MyOrgName" as NonEmptyString,
      requireSecureChannels: false,
      serviceId: "MySubscriptionId" as NonEmptyString,
      serviceName: "MyServiceName" as NonEmptyString,
      id: "123" as NonEmptyString,
      version: 1 as NonNegativeInteger,
      kind: "IRetrievedService",
      _rid: "rid",
      _ts: 1,
      _self: "self",
      _etag: "etag"
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
      DB_SCHEMA: "SelfcareIOSubscriptionMigrations",
      DB_TABLE: "migrations"
    } as IDecodableConfigPostgreSQL;
    const data = ({
      hasBeenVisibleOnce: true,
      isVisible: true,
      subscriptionId: "subId1",
      organizationFiscalCode: "12345678901",
      sourceId: "01EYNPZXQJF9A2DBTH5GYB951V",
      sourceName: "source name",
      sourceSurname: "source surname",
      sourceEmail: "source email",
      serviceVersion: 0,
      serviceName: "Service Test"
    } as unknown) as MigrationRowDataTable;

    const sql = createUpsertSql(config)(data).trim();
    expect(sql).toMatchSnapshot();
  });

  it("should escape single quotes", async () => {
    const config = {
      DB_SCHEMA: "SelfcareIOSubscriptionMigrations",
      DB_TABLE: "migrations"
    } as IDecodableConfigPostgreSQL;
    const data = ({
      hasBeenVisibleOnce: true,
      isVisible: true,
      subscriptionId: "subId2",
      organizationFiscalCode: "12345678901",
      sourceId: "01EYNPZXQJF9A2DBTH5GYB951V",
      sourceName: "source name",
      sourceSurname: "source surname",
      sourceEmail: "l'email", // <-- single quote!
      serviceVersion: 0,
      serviceName: "Service Test"
    } as unknown) as MigrationRowDataTable;

    const sql = createUpsertSql(config)(data).trim();
    expect(sql).toMatchSnapshot();
  });
});
