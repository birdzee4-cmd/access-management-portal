import assert from "node:assert/strict";
import test from "node:test";

import { requireDatabaseUrl } from "./client.js";

test("requireDatabaseUrl rejects missing and blank values", () => {
  assert.throws(() => requireDatabaseUrl({}), /DATABASE_URL is required/);
  assert.throws(() => requireDatabaseUrl({ DATABASE_URL: "   " }), /DATABASE_URL is required/);
});

test("requireDatabaseUrl returns the environment value without embedding credentials", () => {
  const localPlaceholder =
    "sqlserver://localhost:1433;database=portal_local;user=local_user;password=replace_me";

  assert.equal(requireDatabaseUrl({ DATABASE_URL: localPlaceholder }), localPlaceholder);
});
