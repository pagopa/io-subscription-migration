import * as O from "fp-ts/lib/Option";
import { isLeft, isRight } from "fp-ts/lib/Either";
import {
  getApimOwnerBySubscriptionId,
  getApimUserBySubscription,
  insertDataTable,
  mapDataToTableRow,
  parseOwnerIdFullPath,
  storeDocumentApimToDatabase
} from "../handler";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import {
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL
} from "../../utils/config";
import { ApimSubscriptionResponse } from "../../models/DomainApimResponse";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { QueryResult } from "pg";

const mockSubscriptionId = "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString;
const mockOwnerId = "01EYNPZXQJF9A2DBTH5GYB951V" as NonEmptyString;
const mockOrganizationFiscalCode = "01234567891" as OrganizationFiscalCode;
const mockRetrieveDocument = {
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  version: 0
};
const mockApimSubscriptionResponse = {
  subscriptionId: mockSubscriptionId,
  ownerId: mockOwnerId
} as ApimSubscriptionResponse;
const mockApimUserReponse = {
  id: mockOwnerId,
  firstName: "Nome" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString,
  ...mockApimSubscriptionResponse
};
const mockMigrationRowDataTable = {
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  ownerId: mockOwnerId,
  firstName: "Nome" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString
};
const mockGetClient = () => ({
  subscription: {
    get: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockApimSubscriptionResponse))
  },
  user: {
    get: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockApimUserReponse))
  }
});
const mockApimClient = {
  getClient: mockGetClient
};

const mockQueryResult = {
  command: "INSERT",
  rowCount: 1
} as QueryResult;
const mockClient = {
  connect: jest.fn().mockImplementation(() =>
    Promise.resolve({
      query: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockQueryResult))
    })
  )
};

const mockDocuments = [
  {
    subscriptionId: "01FG981SCZVVDT5E7DPZ6Z2ZR7" as NonEmptyString,
    organizationFiscalCode: "11111111111" as OrganizationFiscalCode,
    serviceName: "Servizi scolastici 2!" as NonEmptyString
  },
  {
    subscriptionId: "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString,
    organizationFiscalCode: "01234567891" as OrganizationFiscalCode,
    serviceName: "Lorenzo Test" as NonEmptyString
  },
  {
    subscriptionI: "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString,
    organizationFiscalCode: "01234567891" as OrganizationFiscalCode,
    serviceName: "Lorenzo Test" as NonEmptyString
  }
];

const mockConfig = {};

describe("getApimOwnerBySubscriptionId", () => {
  it("should have valid properties", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;

    const res = await getApimOwnerBySubscriptionId(
      mockConfig as IDecodableConfigAPIM,
      apimClient,
      mockSubscriptionId
    )();

    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("subscriptionId");
      expect(res.right).toHaveProperty("ownerId");
    }
  });
  it("should response with Left for invalid client", async () => {
    const apimClient = mockApimClient.getClient();
    apimClient.subscription.get.mockImplementationOnce(() =>
      Promise.reject(
        new Error(
          "The provided subscription identifier is malformed or invalid."
        )
      )
    );

    const res = await getApimOwnerBySubscriptionId(
      mockConfig as IDecodableConfigAPIM,
      (apimClient as unknown) as ApiManagementClient,
      mockSubscriptionId
    )();

    expect(isRight(res)).toBe(false);
    if (isLeft(res)) {
      expect(res.left).toEqual({ kind: "apimsuberror" });
    }
  });
});

describe("getApimUserBySubscription", () => {
  it("should have valid properties", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;

    const res = await getApimUserBySubscription(
      mockConfig as IDecodableConfigAPIM,
      apimClient,
      mockApimSubscriptionResponse
    )();

    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
    }
  });
});

describe("mapDataToTableRow", () => {
  it("should create a valida data structure", () => {
    const res = mapDataToTableRow(mockRetrieveDocument, {
      apimUser: mockApimUserReponse,
      apimSubscription: mockApimSubscriptionResponse
    });

    expect(res).toMatchObject(mockMigrationRowDataTable);
  });
});

describe("insertDataTable", () => {
  it("should insert valid data", async () => {
    const mockClientPool = await mockClient.connect();
    const res = await insertDataTable(
      mockClientPool,
      mockConfig as IDecodableConfigPostgreSQL,
      mockMigrationRowDataTable
    )();

    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("command", "INSERT");
      expect(res.right).toHaveProperty("rowCount", 1);
    }
  });
});

describe("storeDocumentApimToDatabase", () => {
  it("should", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const mockClientPool = await mockClient.connect();
    const res = await storeDocumentApimToDatabase(
      apimClient,
      mockConfig as any,
      mockClientPool,
      mockDocuments[0] as any
    )();
    console.log(res);
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("command", "INSERT");
      expect(res.right).toHaveProperty("rowCount", 1);
    }
  });
});

/* describe("parseOwnerIdFullPath", () => {
  it("should parse valid owner Id full path", async () => {
    const fullPath = "" as NonEmptyString;
    const expected = "";
    const parsed = parseOwnerIdFullPath(fullPath);
    if (O.isSome(parsed)) {
      expect(parsed.value).toEqual(expected);
    } else {
      fail("Expected some value, received none");
    }
  });
});
*/
