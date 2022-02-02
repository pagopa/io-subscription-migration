import { ErrorResponse } from "@azure/arm-apimanagement";

import { pipe } from "fp-ts/lib/function";
import { DatabaseError } from "pg";
import {
  IApimSubError,
  IDbError,
  toApimSubError,
  toPostgreSQLError
} from "../models/DomainErrors";

export type ErrorApimResponse = ErrorResponse & {
  readonly statusCode?: number;
};

export type ErrorPostgreSQL = DatabaseError & {
  readonly statusCode?: number;
};

export const mapPostgreSQLError = (errorResponse: ErrorPostgreSQL): IDbError =>
  pipe(
    errorResponse,
    e => {
      switch (e.code) {
        case "23505":
          return "Duplicate Primary Key";
        case "42P00":
          return "Table not found";
        default:
          return "DB Generic Error";
      }
    },
    toPostgreSQLError
  );

export const mapApimSubError = (
  errorResponse: ErrorApimResponse
): IApimSubError =>
  pipe(
    errorResponse,
    e => {
      switch (e.statusCode) {
        case 400:
          return "Invalid Subscription Id";
        case 404:
          return "Subscription not found";
        default:
          return "APIM Generic error";
      }
    },
    toApimSubError
  );
