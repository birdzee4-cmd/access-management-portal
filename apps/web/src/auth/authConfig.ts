import {
  BrowserCacheLocation,
  PublicClientApplication,
  type Configuration,
  type IPublicClientApplication,
} from "@azure/msal-browser";

export interface FrontendAuthEnvironment {
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_API_CLIENT_ID?: string;
  readonly VITE_ENTRA_REDIRECT_URI?: string;
  readonly VITE_ENTRA_API_SCOPE?: string;
}

export interface FrontendAuthConfiguration {
  readonly clientId: string;
  readonly tenantId: string;
  readonly apiClientId: string;
  readonly redirectUri: string;
  readonly apiScope: string;
}

const placeholderValues = new Set([
  "replace_me",
  "00000000-0000-0000-0000-000000000000",
]);

function configuredValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  const containsPlaceholder =
    normalized &&
    [...placeholderValues].some((placeholder) => normalized.includes(placeholder));
  return normalized && !containsPlaceholder ? normalized : null;
}

export function readFrontendAuthConfiguration(
  environment: FrontendAuthEnvironment,
): FrontendAuthConfiguration | null {
  const values = {
    clientId: configuredValue(environment.VITE_ENTRA_CLIENT_ID),
    tenantId: configuredValue(environment.VITE_ENTRA_TENANT_ID),
    apiClientId: configuredValue(environment.VITE_ENTRA_API_CLIENT_ID),
    redirectUri: configuredValue(environment.VITE_ENTRA_REDIRECT_URI),
    apiScope: configuredValue(environment.VITE_ENTRA_API_SCOPE),
  };
  const identityConfiguredCount = [
    values.clientId,
    values.tenantId,
    values.apiClientId,
    values.apiScope,
  ].filter(Boolean).length;

  if (identityConfiguredCount === 0) {
    return null;
  }

  if (identityConfiguredCount !== 4 || !values.redirectUri) {
    throw new Error(
      "Frontend authentication is partially configured. Set all VITE_ENTRA_* values or leave every value as a placeholder.",
    );
  }

  const redirectUri = new URL(values.redirectUri as string);
  if (redirectUri.protocol !== "https:" && redirectUri.hostname !== "localhost") {
    throw new Error("VITE_ENTRA_REDIRECT_URI must use HTTPS unless it targets localhost.");
  }

  const apiClientId = values.apiClientId as string;
  const apiScope = values.apiScope as string;
  if (apiScope !== "api://" + apiClientId + "/access_as_user") {
    throw new Error(
      "VITE_ENTRA_API_SCOPE must equal api://<VITE_ENTRA_API_CLIENT_ID>/access_as_user.",
    );
  }

  return {
    clientId: values.clientId as string,
    tenantId: values.tenantId as string,
    apiClientId,
    redirectUri: redirectUri.toString(),
    apiScope,
  };
}

export function createMsalClient(
  auth: FrontendAuthConfiguration,
): IPublicClientApplication {
  const configuration: Configuration = {
    auth: {
      clientId: auth.clientId,
      authority: "https://login.microsoftonline.com/" + auth.tenantId,
      redirectUri: auth.redirectUri,
      postLogoutRedirectUri: auth.redirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
  };

  return new PublicClientApplication(configuration);
}
