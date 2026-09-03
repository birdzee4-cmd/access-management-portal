import assert from "node:assert/strict";
import test from "node:test";

import { readFrontendAuthConfiguration } from "./authConfig.js";

test("placeholder identity settings keep local frontend authentication unconfigured", () => {
  assert.equal(
    readFrontendAuthConfiguration({
      VITE_ENTRA_CLIENT_ID: "replace_me",
      VITE_ENTRA_TENANT_ID: "replace_me",
      VITE_ENTRA_API_CLIENT_ID: "replace_me",
      VITE_ENTRA_REDIRECT_URI: "http://localhost:5173",
      VITE_ENTRA_API_SCOPE: "api://replace_me/access_as_user",
    }),
    null,
  );
});

test("partial frontend Entra configuration fails clearly", () => {
  assert.throws(
    () =>
      readFrontendAuthConfiguration({
        VITE_ENTRA_CLIENT_ID: "11111111-1111-4111-8111-111111111111",
        VITE_ENTRA_REDIRECT_URI: "http://localhost:5173",
      }),
    /partially configured/,
  );
});

test("complete frontend Entra configuration is normalized", () => {
  const configuration = readFrontendAuthConfiguration({
    VITE_ENTRA_CLIENT_ID: "11111111-1111-4111-8111-111111111111",
    VITE_ENTRA_TENANT_ID: "22222222-2222-4222-8222-222222222222",
    VITE_ENTRA_API_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
    VITE_ENTRA_REDIRECT_URI: "http://localhost:5173",
    VITE_ENTRA_API_SCOPE: "api://33333333-3333-4333-8333-333333333333/access_as_user",
  });

  assert.equal(configuration?.redirectUri, "http://localhost:5173/");
  assert.equal(configuration?.apiClientId, "33333333-3333-4333-8333-333333333333");
});

test("frontend rejects a scope that does not belong to the configured API client", () => {
  assert.throws(
    () =>
      readFrontendAuthConfiguration({
        VITE_ENTRA_CLIENT_ID: "11111111-1111-4111-8111-111111111111",
        VITE_ENTRA_TENANT_ID: "22222222-2222-4222-8222-222222222222",
        VITE_ENTRA_API_CLIENT_ID: "33333333-3333-4333-8333-333333333333",
        VITE_ENTRA_REDIRECT_URI: "http://localhost:5173",
        VITE_ENTRA_API_SCOPE: "api://44444444-4444-4444-8444-444444444444/access_as_user",
      }),
    /must equal/,
  );
});
