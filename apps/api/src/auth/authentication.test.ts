import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPair, SignJWT } from "jose";

import {
  AuthenticationConfigurationError,
  AuthenticationError,
  AuthenticationService,
  AuthorizationError,
  EntraJwtAccessTokenValidator,
  getAdminTestIdentity,
  getAuthenticatedIdentity,
  readEntraAuthenticationConfiguration,
  requireAuthenticatedUser,
  requireRole,
} from "./index.js";
import type {
  AccessTokenValidator,
  AuthenticatedUser,
  HeaderReader,
} from "./types.js";

function headers(values: Readonly<Record<string, string>> = {}): HeaderReader {
  const normalized = new Map(
    Object.entries(values).map(([name, value]) => [name.toLowerCase(), value]),
  );

  return {
    get: (name) => normalized.get(name.toLowerCase()) ?? null,
  };
}

function user(roles: AuthenticatedUser["roles"] = ["Viewer"]): AuthenticatedUser {
  return {
    entraObjectId: "00000000-0000-4000-8000-00000000f001",
    email: "fake.authenticated.user@example.invalid",
    displayName: "Fake Authenticated User",
    roles,
    claims: { oid: "00000000-0000-4000-8000-00000000f001" },
    authenticationSource: "ENTRA",
  };
}

test("missing Authorization bearer token is rejected", async () => {
  const validator: AccessTokenValidator = {
    validate: async () => user(),
  };
  const authentication = new AuthenticationService(validator, {
    APP_ENV: "development",
    ENABLE_DEV_AUTH_MOCK: "false",
  });

  await assert.rejects(
    requireAuthenticatedUser({ headers: headers() }, authentication),
    (error) =>
      error instanceof AuthenticationError &&
      error.statusCode === 401 &&
      error.code === "missing_authentication",
  );
});

test("a validated token produces the validator's authenticated context", async () => {
  const expected = user(["Approver"]);
  const validator: AccessTokenValidator = {
    validate: async (token) => {
      assert.equal(token, "offline-test-token");
      return expected;
    },
  };
  const authentication = new AuthenticationService(validator, {
    APP_ENV: "development",
    ENABLE_DEV_AUTH_MOCK: "false",
  });

  const actual = await requireAuthenticatedUser(
    { headers: headers({ authorization: "Bearer offline-test-token" }) },
    authentication,
  );

  assert.equal(actual, expected);
});

test("me endpoint boundary returns only safe identity fields", async () => {
  const authentication = new AuthenticationService(
    { validate: async () => user(["Admin"]) },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );

  const response = await getAuthenticatedIdentity(
    { headers: headers({ authorization: "Bearer offline-test-token" }) },
    authentication,
  );

  assert.deepEqual(response, {
    authenticated: true,
    displayName: "Fake Authenticated User",
    email: "fake.authenticated.user@example.invalid",
    roles: ["Admin"],
  });
  assert.equal("claims" in response, false);
  assert.equal("accessToken" in response, false);
  assert.equal("authorization" in response, false);
});

test("admin endpoint boundary accepts Admin and rejects Viewer", async () => {
  const adminAuthentication = new AuthenticationService(
    { validate: async () => user(["Admin"]) },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );
  const viewerAuthentication = new AuthenticationService(
    { validate: async () => user(["Viewer"]) },
    { ENABLE_DEV_AUTH_MOCK: "false" },
  );
  const request = {
    headers: headers({ authorization: "Bearer offline-test-token" }),
  };

  const response = await getAdminTestIdentity(request, adminAuthentication);
  assert.equal(response.authorizedRole, "Admin");
  await assert.rejects(
    getAdminTestIdentity(request, viewerAuthentication),
    (error) => error instanceof AuthorizationError,
  );
});

test("Admin is allowed through an Admin role guard", () => {
  const admin = user(["Admin"]);
  assert.equal(requireRole(admin, "Admin"), admin);
});

test("Viewer is denied from an Admin-only operation", () => {
  assert.throws(
    () => requireRole(user(["Viewer"]), "Admin"),
    (error) =>
      error instanceof AuthorizationError &&
      error.statusCode === 403 &&
      error.code === "insufficient_role",
  );
});

test("development mock requires both the opt-in flag and request header", async () => {
  const authentication = new AuthenticationService(null, {
    APP_ENV: "development",
    ENABLE_DEV_AUTH_MOCK: "true",
  });

  const mockUser = await authentication.authenticate(
    headers({ "x-development-auth": "enabled" }),
  );

  assert.equal(mockUser.email, "dev.user@example.invalid");
  assert.equal(mockUser.authenticationSource, "DEVELOPMENT_MOCK");
  assert.deepEqual(mockUser.roles, ["Viewer"]);
});

test("development mock is disabled by default even when its request header is present", async () => {
  const authentication = new AuthenticationService(
    { validate: async () => user() },
    { APP_ENV: "development" },
  );

  await assert.rejects(
    authentication.authenticate(headers({ "x-development-auth": "enabled" })),
    (error) =>
      error instanceof AuthenticationError &&
      error.code === "missing_authentication",
  );
});

test("development mock cannot activate outside development", async () => {
  const authentication = new AuthenticationService(null, {
    APP_ENV: "production",
    ENABLE_DEV_AUTH_MOCK: "true",
  });

  await assert.rejects(
    authentication.authenticate(headers({ "x-development-auth": "enabled" })),
    (error) => error instanceof AuthenticationConfigurationError,
  );
});

test("backend configuration rejects angle-bracket identifiers", () => {
  assert.throws(
    () =>
      readEntraAuthenticationConfiguration({
        ENTRA_TENANT_ID: "<22222222-2222-4222-8222-222222222222>",
        ENTRA_API_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
        ENTRA_EXPECTED_AUDIENCE:
          "api://33333333-3333-4333-8333-333333333333",
      }),
    (error) => error instanceof AuthenticationConfigurationError,
  );
});

test("backend configuration rejects a delegated scope as the audience", () => {
  assert.throws(
    () =>
      readEntraAuthenticationConfiguration({
        ENTRA_TENANT_ID: "22222222-2222-4222-8222-222222222222",
        ENTRA_API_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
        ENTRA_EXPECTED_AUDIENCE:
          "api://33333333-3333-4333-8333-333333333333/access_as_user",
      }),
    (error) => error instanceof AuthenticationConfigurationError,
  );
});

async function signedAccessToken(scopes: string) {
  const tenantId = "22222222-2222-4222-8222-222222222222";
  const apiClientId = "33333333-3333-4333-8333-333333333333";
  const issuer = "https://login.microsoftonline.com/" + tenantId + "/v2.0";
  const audience = "api://" + apiClientId;
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const token = await new SignJWT({
    tid: tenantId,
    oid: "00000000-0000-4000-8000-00000000f001",
    preferred_username: "fake.authenticated.user@example.invalid",
    name: "Fake Authenticated User",
    roles: ["Admin"],
    scp: scopes,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject("fake-subject")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  return {
    token,
    validator: new EntraJwtAccessTokenValidator(
      {
        tenantId,
        apiClientId,
        expectedAudience: audience,
        expectedIssuers: [issuer],
        jwksUri: "https://example.invalid/keys",
      },
      async () => publicKey,
    ),
  };
}

test("JWT validator accepts the required delegated scope and application role", async () => {
  const { token, validator } = await signedAccessToken(
    "profile access_as_user",
  );

  const authenticated = await validator.validate(token);

  assert.equal(authenticated.authenticationSource, "ENTRA");
  assert.deepEqual(authenticated.roles, ["Admin"]);
});

test("JWT validator rejects a token without the required delegated scope", async () => {
  const { token, validator } = await signedAccessToken("profile");

  await assert.rejects(
    validator.validate(token),
    /missing the required delegated scope/,
  );
});
