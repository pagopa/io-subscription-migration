export interface IDbError {
  readonly kind: "dberror";
}

export interface IApimSubError {
  readonly kind: "apimsuberror";
}

export interface IApimUserError {
  readonly kind: "apimusererror";
}

export type DomainError = IDbError | IApimSubError | IApimUserError;
