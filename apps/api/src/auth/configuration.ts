export type AuthenticationEnvironment = Readonly<Record<string, string | undefined>>;

export interface EntraAuthenticationConfiguration {
  readonly tenantId: string;
  readonly apiClientId: string;
  readonly expectedAudience: string;
  readonly expectedIssuers: string[];
  readonly jwksUri: string;
}

export class AuthenticationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationConfigurationError";
  }
}

const placeholderValues = new Set([
  "replace_me",
  "00000000-0000-0000-0000-000000000000",
]);

const entraIdentifierPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireConfiguredValue(
  environment: AuthenticationEnvironment,
  key: string,
): string {
  const value = environment[key]?.trim();
  if (!value || placeholderValues.has(value)) {
    throw new AuthenticationConfigurationError(key + " must be configured.");
  }

  return value;
}

function requireEntraIdentifier(
  environment: AuthenticationEnvironment,
  key: string,
): string {
  const value = requireConfiguredValue(environment, key);
  if (!entraIdentifierPattern.test(value)) {
    throw new AuthenticationConfigurationError(
      key + " must be an Entra identifier without angle brackets.",
    );
  }

  return value;
}

export function readEntraAuthenticationConfiguration(
  environment: AuthenticationEnvironment = process.env,
): EntraAuthenticationConfiguration {
  const tenantId = requireEntraIdentifier(environment, "ENTRA_TENANT_ID");
  const apiClientId = requireEntraIdentifier(environment, "ENTRA_API_CLIENT_ID");
  const expectedAudience = requireConfiguredValue(
    environment,
    "ENTRA_EXPECTED_AUDIENCE",
  );

  if (
    expectedAudience.includes("<") ||
    expectedAudience.includes(">") ||
    expectedAudience.endsWith("/access_as_user")
  ) {
    throw new AuthenticationConfigurationError(
      "ENTRA_EXPECTED_AUDIENCE must be the token audience, not a delegated scope.",
    );
  }

  return {
    tenantId,
    apiClientId,
    expectedAudience,
    expectedIssuers: [
      "https://login.microsoftonline.com/" + tenantId + "/v2.0",
      "https://sts.windows.net/" + tenantId + "/",
    ],
    jwksUri:
      "https://login.microsoftonline.com/" +
      encodeURIComponent(tenantId) +
      "/discovery/v2.0/keys",
  };
}
