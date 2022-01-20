import { isLeft, isRight } from "fp-ts/lib/Either";
import {
  getApimOwnerBySubscriptionId,
  getApimUserByOwnerId,
  insertDataTable,
  mapDataToTableRow,
  processB,
} from "../handler";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import {
  getConfigOrThrow,
  IDecodableConfigAPIM,
  IDecodableConfigPostgreSQL,
} from "../../utils/config";
import { getApiClient } from "../../utils/apim";
import { ApimSubscriptionResponse } from "../../models/DomainApimResponse";
import { clientDB } from "../../utils/dbconnector";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { QueryResult } from "pg";

const mockSubscriptionId = "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString;
const mockOwnerId = "01EYNPZXQJF9A2DBTH5GYB951V" as NonEmptyString;
const mockOrganizationFiscalCode = "01234567891" as OrganizationFiscalCode;
const mockRetrieveDocument = {
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
};
const mockApimSubscriptionResponse = {
  subscriptionId: mockSubscriptionId,
  ownerId: mockOwnerId,
} as ApimSubscriptionResponse;
const mockApimUserReponse = {
  id: mockOwnerId,
  subscriptionId: mockSubscriptionId,
  ownerId: mockOwnerId,
  firstName: "Nome" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString,
};
const mockMigrationRowDataTable = {
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  ownerId: mockOwnerId,
  firstName: "Nome" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString,
};
const mockGetClient = () => ({
  subscription: {
    get: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockApimSubscriptionResponse)),
  },
  user: {
    get: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockApimUserReponse)),
  },
});
const mockApimClient = {
  getClient: mockGetClient,
};

const mockQueryResult = {
  command: "INSERT",
  rowCount: 1,
} as QueryResult;
const mockClient = {
  connect: jest.fn().mockImplementation(() =>
    Promise.resolve({
      query: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockQueryResult)),
    })
  ),
};

const mockDocuments = [
  {
    subscriptionId: "01FG981SCZVVDT5E7DPZ6Z2ZR7" as NonEmptyString,
    organizationFiscalCode: "11111111111" as OrganizationFiscalCode,
    serviceName: "Servizi scolastici 2!" as NonEmptyString,
  },
  {
    subscriptionId: "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString,
    organizationFiscalCode: "01234567891" as OrganizationFiscalCode,
    serviceName: "Lorenzo Test" as NonEmptyString,
  },
  {
    subscriptionI: "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString,
    organizationFiscalCode: "01234567891" as OrganizationFiscalCode,
    serviceName: "Lorenzo Test" as NonEmptyString,
  },
];

const mockConfig = {};

// const config = getConfigOrThrow();
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
      expect(res.left).toEqual("Apim Subscription Error");
    }
  });
});

describe("getApimUserByOwnerId", () => {
  it("should have valid properties", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;

    const res = await getApimUserByOwnerId(
      mockConfig as IDecodableConfigAPIM,
      apimClient,
      mockApimSubscriptionResponse
    )();

    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("subscriptionId");
      expect(res.right).toHaveProperty("ownerId");
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
    }
  });
});

describe("mapDataToTableRow", () => {
  it("should create a valida data structure", () => {
    const res = mapDataToTableRow(mockRetrieveDocument, mockApimUserReponse);

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

describe("Process B", () => {
  it("should", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const mockClientPool = await mockClient.connect();
    const res = await processB(
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
