import { isLeft, isRight } from "fp-ts/lib/Either";
import {
  getApimOwnerBySubscriptionId,
  getApimUserByOwnerId,
  processoA,
  validateDocument,
} from "../handler";
import {
  EmailString,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import { getConfigOrThrow, IDecodableConfigAPIM } from "../../utils/config";
import { getApiClient } from "../../utils/apim";
import { OwnerData } from "../../models/Domain";
import { ApimSubscriptionResponse } from "../../models/DomainApimResponse";

const mockApimClient = jest.fn() as any;
const mockApimConfig = jest.fn() as any;
const mockDbConfig = jest.fn() as any;
const mockPool = jest.fn() as any;
const mockDocuments = [
  {
    subscriptionId: "01EYNQ0864HKYR1Q9PXPJ18W7G" as NonEmptyString,
    organizationFiscalCode: "01234567891" as OrganizationFiscalCode,
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

const config = getConfigOrThrow();
describe("getApimOwnerBySubscriptionId", () => {
  it("should have valid properties", async () => {
    const apimClient = getApiClient(
      {
        clientId: config.APIM_CLIENT_ID,
        secret: config.APIM_SECRET,
        tenantId: config.APIM_TENANT_ID,
      },
      config.APIM_SUBSCRIPTION_ID
    );
    const subscriptionId = "01EYNQ08CFNATVH1YBN8D14Y8S";

    const res = await getApimOwnerBySubscriptionId(
      config as IDecodableConfigAPIM,
      apimClient,
      subscriptionId as NonEmptyString
    )();

    console.log(res);

    expect(isRight(res)).toBe(true);
    if (isRight(res)) {
      expect(res.right).toHaveProperty("subscriptionId");
      expect(res.right).toHaveProperty("ownerId");
    }
  });
});

describe("getApimUserByOwnerId", () => {
  it("should have valid properties", async () => {
    const apimClient = getApiClient(
      {
        clientId: config.APIM_CLIENT_ID,
        secret: config.APIM_SECRET,
        tenantId: config.APIM_TENANT_ID,
      },
      config.APIM_SUBSCRIPTION_ID
    );
    const apimSubscriptionResponse = {
      subscriptionId: "01EYNQ08CFNATVH1YBN8D14Y8S",
      ownerId: "01EYNPZXQJF9A2DBTH5GYB951V",
    };

    const res = await getApimUserByOwnerId(
      config as IDecodableConfigAPIM,
      apimClient,
      apimSubscriptionResponse as ApimSubscriptionResponse
    )();

    console.log(res);

    expect(isRight(res)).toBe(true);
    // if (isRight(res)) {
    //   expect(res.right).toHaveProperty("subscriptionId");
    //   expect(res.right).toHaveProperty("ownerId");
    // }
  });
});
