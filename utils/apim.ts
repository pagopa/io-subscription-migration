import { ApiManagementClient } from "@azure/arm-apimanagement";
// import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
// import { toError } from "fp-ts/lib/Either";
// import { pipe } from "fp-ts/lib/function";
// import * as TE from "fp-ts/lib/TaskEither";
import { DefaultAzureCredential } from "@azure/identity";

export interface IServicePrincipalCreds {
  readonly clientId: string;
  readonly secret: string;
  readonly tenantId: string;
}

export interface IAzureApimConfig {
  readonly subscriptionId: string;
  readonly apimResourceGroup: string;
  readonly apim: string;
}
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getApiClient(
  servicePrincipalCreds: IServicePrincipalCreds,
  subscriptionId: string
): ApiManagementClient {
  const credential = new DefaultAzureCredential();

  const client = new ApiManagementClient(credential, subscriptionId);

  return client;
  // return pipe(
  //   TE.tryCatch(
  //     () =>
  //       msRestNodeAuth.loginWithServicePrincipalSecret(
  //         servicePrincipalCreds.clientId,
  //         servicePrincipalCreds.secret,
  //         servicePrincipalCreds.tenantId
  //       ),
  //     toError
  //   ),
  //   TE.map(
  //     (credentials) => new ApiManagementClient(credentials, subscriptionId)
  //   )
  // );
}
