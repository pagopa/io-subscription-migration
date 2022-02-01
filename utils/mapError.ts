import { ErrorResponse } from "@azure/arm-apimanagement";
import { pipe } from "fp-ts/lib/function";
import { IApimSubError, toApimSubError } from "../models/DomainErrors";

export type ErrorApimResponse = ErrorResponse & {
  readonly statusCode?: number;
};

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
