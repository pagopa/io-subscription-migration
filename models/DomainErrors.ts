export interface IDbError {
  readonly kind: "dberror";
}

export interface IApimSubError {
  readonly kind: "apimsuberror";
  readonly message: string;
}

export interface IApimUserError {
  readonly kind: "apimusererror";
}

export const toApimSubError = (message: string): IApimSubError => ({
  kind: "apimsuberror",
  message
});

export type DomainError = IDbError | IApimSubError | IApimUserError;
