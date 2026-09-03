import {
  BrowserCacheLocation,
  PublicClientApplication,
  type Configuration,
  type IPublicClientApplication,
} from "@azure/msal-browser";

export interface FrontendAuthEnvironment {
  readonly VITE_ENTRA_CLIENT_ID?: string;
  readonly VITE_ENTRA_TENANT_ID?: string;
  readonly VITE_ENTRA_REDIRECT_URI?: string;
  readonly VITE_ENTRA_API_SCOPE?: string;
}

export interface FrontendAuthConfiguration {
  readonly clientId: string;
  readonly tenantId: string;
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
    redirectUri: configuredValue(environment.VITE_ENTRA_REDIRECT_URI),
    apiScope: configuredValue(environment.VITE_ENTRA_API_SCOPE),
  };
  const identityConfiguredCount = [
    values.clientId,
    values.tenantId,
    values.apiScope,
  ].filter(Boolean).length;

  if (identityConfiguredCount === 0) {
    return null;
  }

  if (identityConfiguredCount !== 3 || !values.redirectUri) {
    throw new Error(
      "Frontend authentication is partially configured. Set all VITE_ENTRA_* values or leave every value as a placeholder.",
    );
  }

  const redirectUri = new URL(values.redirectUri as string);
  if (redirectUri.protocol !== "https:" && redirectUri.hostname !== "localhost") {
    throw new Error("VITE_ENTRA_REDIRECT_URI must use HTTPS unless it targets localhost.");
  }

  return {
    clientId: values.clientId as string,
    tenantId: values.tenantId as string,
    redirectUri: redirectUri.toString(),
    apiScope: values.apiScope as string,
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
