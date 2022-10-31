import * as express from "express";
import { Context } from "@azure/functions";
import { ResponseSuccessJson } from "@pagopa/ts-commons/lib/responses";
import {
  NonEmptyString,
  OrganizationFiscalCode
} from "@pagopa/ts-commons/lib/strings";
import { Pool, QueryResult } from "pg";
import { SubscriptionStatus } from "../../GetOwnershipClaimStatus/handler";
import { IConfig } from "../../utils/config";
import { createHandler, createSqlStatus } from "../handler";
import { IDbError } from "../../models/DomainErrors";

const mockDBConfig = {
  DB_HOST: "localhost" as NonEmptyString,
  DB_IDLE_TIMEOUT: 3000,
  DB_NAME: "test" as NonEmptyString,
  DB_PASSWORD: "psw" as NonEmptyString,
  DB_PORT: 5454,
  DB_SCHEMA: "TableSchema" as NonEmptyString,
  DB_TABLE: "Table" as NonEmptyString,
  DB_USER: "User" as NonEmptyString
};
const mockConfig = ({} as unknown) as IConfig;

const mockQueryCommand = jest.fn().mockImplementation(async () => ({
  command: "SELECT",
  rowCount: 0
}));
const mockPool = {
  query: mockQueryCommand
};
const mockContext = {
  log: jest.fn(),
  executionContext: { functionName: jest.fn() }
};

const aDbError: IDbError = {
  kind: "dberror",
  message: "an error message"
};

const createMockExpressResponse = () => {
  const self: express.Response = ({
    json: jest.fn(_ => self),
    set: jest.fn(_ => self),
    status: jest.fn(_ => self)
  } as unknown) as express.Response;
  return self;
};

describe("Create Handler Test", () => {
  it("should return a server error when db query fails", async () => {
    mockQueryCommand.mockImplementationOnce(() => Promise.reject(aDbError));

    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );

    const mockExpressResponse = createMockExpressResponse();
    response.apply(mockExpressResponse);

    expect(mockExpressResponse.status).toHaveBeenCalledWith(500);
  });

  it("should return a server error when db query returns data in unexpected shape", async () => {
    mockQueryCommand.mockImplementationOnce(async () => ({
      command: "SELECT",
      rowCount: 0,
      rows: [
        // a result in a wrong shape
        {
          foo: "bar"
        }
      ]
    }));

    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );

    const mockExpressResponse = createMockExpressResponse();
    response.apply(mockExpressResponse);

    expect(mockExpressResponse.status).toHaveBeenCalledWith(500);
  });

  it("should return success on empty results", async () => {
    mockQueryCommand.mockImplementationOnce(async () => ({
      command: "SELECT",
      rowCount: 0,
      rows: [
        {
          sourceEmail: "source@email.com",
          sourceId: "1234",
          sourceName: "TestName",
          sourceSurname: "TestSurname",
          completed: 2,
          initial: 1,
          failed: 0,
          processing: 2
        }
      ]
    }));

    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );
  });

  it("should return success on empty results", async () => {
    mockQueryCommand.mockImplementationOnce(async () => ({
      command: "SELECT",
      rowCount: 0,
      rows: []
    }));

    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );

    expect(response.kind).toBe("IResponseSuccessJson");
    const mockExpressResponse = createMockExpressResponse();
    response.apply(mockExpressResponse);
    expect(mockExpressResponse.status).toHaveBeenCalledWith(200);
    expect(mockExpressResponse.json).toHaveBeenCalledWith({ items: [] });
  });

  it("should return success on retireved data", async () => {
    const aDate = new Date();
    mockQueryCommand.mockImplementationOnce(async () => ({
      command: "SELECT",
      rowCount: 0,
      rows: [
        {
          sourceEmail: "source@email.com",
          sourceId: "1234",
          sourceName: "TestName",
          sourceSurname: "TestSurname",
          completed: 2,
          initial: 1,
          failed: 0,
          processing: 2,
          lastUpdate: aDate.toISOString()
        }
      ]
    }));

    const handler = createHandler(mockConfig, (mockPool as unknown) as Pool);

    const response = await handler(
      (mockContext as unknown) as Context,
      "12345678901" as OrganizationFiscalCode
    );

    expect(response.kind).toBe("IResponseSuccessJson");
    const mockExpressResponse = createMockExpressResponse();
    response.apply(mockExpressResponse);
    expect(mockExpressResponse.status).toHaveBeenCalledWith(200);
    expect(mockExpressResponse.json).toHaveBeenCalledWith({
      items: [
        {
          delegate: {
            sourceEmail: "source@email.com",
            sourceId: "1234",
            sourceName: "TestName",
            sourceSurname: "TestSurname"
          },
          lastUpdate: new Date(aDate),
          status: { completed: 2, initial: 1, failed: 0, processing: 2 }
        }
      ]
    });
  });
});
