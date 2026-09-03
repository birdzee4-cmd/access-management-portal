import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthenticationConfigurationError,
  AuthenticationError,
  AuthenticationService,
  AuthorizationError,
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
