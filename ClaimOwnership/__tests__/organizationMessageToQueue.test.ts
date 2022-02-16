import { Context } from "@azure/functions";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { organizationMessageToQueue } from "../handler";
import * as E from "fp-ts/lib/Either";

const organizationFiscalCode = "00000000000" as OrganizationFiscalCode;
const sourceId = "11111111111111111111111111" as NonEmptyString;

const mockBindindigs = jest.fn(() => Promise.resolve(void 0));
const mockContext = ({
  bindings: mockBindindigs
} as unknown) as Context;
describe("organizationMessageToQueue", () => {
  it("should create a valid message in queue", () => {
    const res = organizationMessageToQueue(mockContext)(
      organizationFiscalCode,
      sourceId
    );
    if (E.isRight(res)) {
      expect(res.right).toBe(true);
    }
  });
  it("should not create a valid message in queue", () => {
    const res = organizationMessageToQueue(mockContext)(
      (0 as unknown) as OrganizationFiscalCode,
      sourceId
    );
    if (E.isLeft(res)) {
      expect(res.left).toBe(false);
    }
  });
});
