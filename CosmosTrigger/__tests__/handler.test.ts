import * as O from "fp-ts/lib/Option";
import { isLeft, isRight } from "fp-ts/lib/Either";
import {
  getApimOwnerBySubscriptionId,
  getApimUserBySubscription,
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
import {
  ApimDelegateUserResponse,
  ApimSubscriptionResponse
} from "../../models/DomainApimResponse";
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { QueryResult } from "pg";

const mockSubscriptionId = "01EYNQ08CFNATVH1YBN8D14Y8S" as NonEmptyString;
const mockOwnerId = "/subscriptions/subid/resourceGroups/resourceGroupName/providers/Microsoft.ApiManagement/service/apimServiceName/users/01EYNPZXQJF9A2DBTH5GYB951V" as NonEmptyString;
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
const mockGetClient = () => ({
  subscription: {
    get: jest
      .fn()
      .mockImplementation(() => Promise.resolve(mockApimSubscriptionResponse))
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
  it("should have valid properties for Organization", async () => {
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
      expect(res.right).toHaveProperty("kind", "organization");
    }
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
    if (isRight(res)) {
      expect(res.right).toHaveProperty("id");
      expect(res.right).toHaveProperty("firstName");
      expect(res.right).toHaveProperty("lastName");
      expect(res.right).toHaveProperty("email");
      expect(res.right).toHaveProperty("kind", "delegate");
    }
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
      mockDocuments[0] as any
    )();
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
      mockDocuments[0] as any
    )();
    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("command", "INSERT");
      expect(res.right).toHaveProperty("rowCount", 1);
    }
  });
});
