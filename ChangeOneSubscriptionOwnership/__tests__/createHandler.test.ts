import { ApiManagementClient } from "@azure/arm-apimanagement";
import { Context } from "@azure/functions";
import { Pool, QueryResult } from "pg";
import { IConfig } from "../../utils/config";
import * as db from "../../utils/db";
import * as handler from "../handler";

import * as TE from "fp-ts/TaskEither";

const mockConfig = ({} as unknown) as IConfig;
const mockApimClient = {
  subscription: {
    update: jest.fn().mockReturnValue(
      Promise.resolve({
        ownerId: "abc"
      })
    )
  }
};
const mockQueryResult = {
  command: "UPDATE",
  rowCount: 1
} as QueryResult;
const mockPool = {
  query: jest.fn().mockImplementation(() => Promise.resolve(mockQueryResult))
};
const mockContext = ({} as unknown) as Context;

describe("Create Handler Test", () => {
  it("should call queryDataTable and updateApimSubscription and return void", async () => {
    const message = { subscriptionId: "123", targetId: "abc" };

    const callQueryDatatable = jest
      .spyOn(db, "queryDataTable")
      .mockReturnValueOnce(
        TE.right({
          rows: {}
        } as QueryResult)
      );

    const callUpdateApimSubscription = jest.spyOn(
      handler,
      "updateApimSubscription"
    );
    const callUpdateSubscriptionStatusToDatabase = jest.spyOn(
      handler,
      "updateSubscriptionStatusToDatabase"
    );

    const res = await handler.createHandler(
      mockConfig,
      (mockApimClient as unknown) as ApiManagementClient,
      (mockPool as unknown) as Pool
    )(mockContext, message);

    expect(res).toBe(void 0);
    expect(callUpdateApimSubscription).toHaveBeenCalledTimes(1);
    expect(callUpdateSubscriptionStatusToDatabase).toHaveBeenCalledTimes(1);
    expect(callQueryDatatable).toHaveBeenCalledTimes(1);
  });

  it("should return an error on APIM and DB", async () => {
    const message = { subscriptionId: "123", targetId: "xyz" };

    try {
      await handler.createHandler(
        mockConfig,
        (mockApimClient as unknown) as ApiManagementClient,
        (mockPool as unknown) as Pool
      )(mockContext, message);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
