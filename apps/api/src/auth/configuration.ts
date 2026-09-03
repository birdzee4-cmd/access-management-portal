export type AuthenticationEnvironment = Readonly<Record<string, string | undefined>>;

export interface EntraAuthenticationConfiguration {
  readonly tenantId: string;
  readonly apiClientId: string;
  readonly expectedAudience: string;
  readonly expectedIssuer: string;
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

export function readEntraAuthenticationConfiguration(
  environment: AuthenticationEnvironment = process.env,
): EntraAuthenticationConfiguration {
  const tenantId = requireConfiguredValue(environment, "ENTRA_TENANT_ID");
  const apiClientId = requireConfiguredValue(environment, "ENTRA_API_CLIENT_ID");
  const expectedAudience = requireConfiguredValue(
    environment,
    "ENTRA_EXPECTED_AUDIENCE",
  );
  const expectedIssuer = requireConfiguredValue(environment, "ENTRA_EXPECTED_ISSUER");
  const issuerUrl = new URL(expectedIssuer);

  if (
    issuerUrl.protocol !== "https:" ||
    issuerUrl.username ||
    issuerUrl.password
  ) {
    throw new AuthenticationConfigurationError(
      "ENTRA_EXPECTED_ISSUER must be a credential-free HTTPS URL.",
    );
  }

  return {
    tenantId,
    apiClientId,
    expectedAudience,
    expectedIssuer: issuerUrl.toString(),
    jwksUri:
      "https://login.microsoftonline.com/" +
      encodeURIComponent(tenantId) +
      "/discovery/v2.0/keys",
  };
}
