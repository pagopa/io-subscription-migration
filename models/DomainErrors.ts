export interface IDbError {
  readonly kind: "dberror";
  readonly message?: string;
}

export interface IApimSubError {
  readonly kind: "apimsuberror";
  readonly message: string;
}

export interface IApimUserError {
  readonly kind: "apimusererror";
  readonly message: string;
}

export const toApimSubError = (message: string): IApimSubError => ({
  kind: "apimsuberror",
  message
});

export const toApimUserError = (message: string): IApimUserError => ({
  kind: "apimusererror",
  message
});

export const toPostgreSQLError = (message: string): IDbError => ({
  kind: "dberror",
  message
});

export type DomainError = IDbError | IApimSubError | IApimUserError;
