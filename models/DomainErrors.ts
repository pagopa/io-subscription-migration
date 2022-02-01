export interface IDbError {
  readonly kind: "dberror";
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

export const toApimUserError = (message: string): IApimUserError => {
  // eslint-disable-next-line no-console
  console.log("MESSAge", message);
  return {
    kind: "apimusererror",
    message
  };
};

export type DomainError = IDbError | IApimSubError | IApimUserError;
