import { isLeft, isRight } from "fp-ts/lib/Either";
import {
  getApimOwnerBySubscriptionId,
  getApimUserBySubscription,
  mapDataToTableRow,
  queryDataTable,
  storeDocumentApimToDatabase
} from "../handler";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { IDecodableConfigAPIM } from "../../utils/config";
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse
} from "../../models/DomainApimResponse";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { QueryResult } from "pg";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

const mockSubscriptionId = "00000000000000000000000000" as NonEmptyString;
const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/00000000000000000000000000" as NonEmptyString;
const mockOrganizationFiscalCode = "01234567891" as OrganizationFiscalCode;
const mockRetrieveDocument = {
  serviceId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  version: 0 as NonNegativeInteger
} as RetrievedService;
const mockApimSubscriptionResponse = {
  subscriptionId: mockSubscriptionId,
  ownerId: mockOwnerId
} as ApimSubscriptionResponse;
const mockApimDelegateUserReponse = {
  id: mockOwnerId,
  firstName: "NomeDelegato" as NonEmptyString,
  lastName: "CognomeDelegato" as NonEmptyString,
  email: "email@test.com" as EmailString
} as ApimDelegateUserResponse;
const mockApimOrganizationUserReponse = {
  id: mockOwnerId,
  firstName: "NomeOrganization" as NonEmptyString,
  lastName: "Cognome" as NonEmptyString,
  email: "email@test.com" as EmailString,
  note: "01234567891"
} as ApimDelegateUserResponse;
const mockMigrationRowDataTable = {
  subscriptionId: mockSubscriptionId,
  organizationFiscalCode: mockOrganizationFiscalCode,
  sourceId: mockOwnerId,
  sourceName: "NomeDelegato" as NonEmptyString,
  sourceSurname: "CognomeDelegato" as NonEmptyString,
  sourceEmail: "email@test.com" as EmailString
};
const mockApimSubscriptionGet = jest.fn(() =>
  Promise.resolve(mockApimSubscriptionResponse)
);
const mockGetClient = () => ({
  subscription: {
    get: mockApimSubscriptionGet
  },
  user: {
    get: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(mockApimOrganizationUserReponse)
      )
  }
});
const mockApimClient = {
  getClient: mockGetClient
};
const mockTelemtryClient = {
  trackEvent: jest.fn()
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
    subscriptionId: "00000000000000000000000000" as NonEmptyString,
    organizationFiscalCode: "11111111111" as OrganizationFiscalCode,
    serviceName: "Service Test 1 " as NonEmptyString
  },
  {
    subscriptionId: "00000000000000000000000001" as NonEmptyString,
    organizationFiscalCode: "00000000000" as OrganizationFiscalCode,
    serviceName: "Service Test 2.1" as NonEmptyString
  },
  {
    subscriptionI: "00000000000000000000000002" as NonEmptyString,
    organizationFiscalCode: "00000000000" as OrganizationFiscalCode,
    serviceName: "Service Test 2.2" as NonEmptyString
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
      expect(res.left).toEqual({
        kind: "apimsuberror",
        message: expect.stringContaining("APIM Generic error")
      });
    }
  });
});

describe("getApimUserBySubscription", () => {
  it("should have valid properties for Organization", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;

    const res = await getApimUserBySubscription(
      mockConfig as IDecodableConfigAPIM,
      apimClient,
      mockApimSubscriptionResponse
    )();
    expect(isRight(res)).toBe(true);
  });
  it("should have valid properties for Delegate", async () => {
    const apimClient = mockApimClient.getClient();
    apimClient.user.get.mockImplementationOnce(() =>
      Promise.resolve(mockApimDelegateUserReponse)
    );
    const res = await getApimUserBySubscription(
      mockConfig as IDecodableConfigAPIM,
      (apimClient as unknown) as ApiManagementClient,
      mockApimSubscriptionResponse
    )();
    expect(isRight(res)).toBe(true);
  });
});

describe("mapDataToTableRow", () => {
  it("should create a valida data structure", () => {
    const res = mapDataToTableRow(mockRetrieveDocument, {
      apimUser: mockApimDelegateUserReponse,
      apimSubscription: mockApimSubscriptionResponse
    });

    expect(res).toMatchObject(mockMigrationRowDataTable);
  });
});

describe("storeDocumentApimToDatabase", () => {
  it("should ignore a valid document from Organization", async () => {
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const mockClientPool = await mockClient.connect();
    const res = await storeDocumentApimToDatabase(
      apimClient,
      mockConfig as any,
      mockClientPool,
      mockTelemtryClient as any
    )(mockDocuments[0] as any)();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toBe(undefined);
    }
  });
  it("should insert a valid document from Delegate", async () => {
    const apimClient = mockApimClient.getClient();
    apimClient.user.get.mockImplementationOnce(() =>
      Promise.resolve(mockApimDelegateUserReponse)
    );
    const mockClientPool = await mockClient.connect();
    const res = await storeDocumentApimToDatabase(
      (apimClient as unknown) as ApiManagementClient,
      mockConfig as any,
      mockClientPool,
      mockTelemtryClient as any
    )(mockDocuments[0] as any)();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("command", "INSERT");
      expect(res.right).toHaveProperty("rowCount", 1);
    }
  });

  it("should ignore a Service without Subscription", async () => {
    mockApimSubscriptionGet.mockImplementationOnce(() =>
      Promise.reject({ statusCode: 404 })
    );
    const apimClient = (mockApimClient.getClient() as unknown) as ApiManagementClient;
    const mockClientPool = await mockClient.connect();
    const res = await storeDocumentApimToDatabase(
      apimClient,
      mockConfig as any,
      mockClientPool,
      mockTelemtryClient as any
    )(mockDocuments[0] as any)();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toBe(undefined);
    }
  });
});

describe("queryDataTable", () => {
  it("should return duplicate Primary Key", async () => {
    const mockClientPool = await mockClient.connect();
    mockClientPool.query.mockImplementationOnce(() =>
      Promise.reject({
        code: "23505"
      })
    );
    const res = await queryDataTable(
      mockClientPool,
      `INSERT INTO "ServicesMigration"."Services"(
	"subscriptionId", "organizationFiscalCode", "sourceId", "sourceName", "sourceSurname", "sourceEmail", status, note, "serviceVersion", "serviceName")
	VALUES ('01EYNQ0864HKYR1Q9PXPJ18W7G', '111', '111', 'Test', 'Test', 'Test', 'test', 'test', 1, 'test');`
    )();

    expect(isLeft(res)).toBe(true);
    if (isLeft(res)) {
      expect(res.left.message).toEqual(
        expect.stringContaining("Duplicate Primary Key")
      );
    }
  });
});
