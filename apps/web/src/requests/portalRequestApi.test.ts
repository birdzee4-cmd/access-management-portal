import assert from "node:assert/strict";
import test from "node:test";
import { PortalRequestApiClient, PortalRequestApiError } from "./portalRequestApi.js";

test("Portal request client sends authenticated GET and POST only to Portal routes", async () => {
  const original = globalThis.fetch, calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url, init) => { calls.push({ url: String(url), init });
    return new Response(JSON.stringify(calls.length === 1 ? { roles: [] } : { replayed: false, request: {} }), { status: calls.length === 1 ? 200 : 201, headers: { "content-type": "application/json" } }); }) as typeof fetch;
  try {
    const client = new PortalRequestApiClient(async () => "synthetic-token", "http://localhost:7071/api");
    await client.catalog();
    await client.submit({ requestType: "ADD", requestedRoleId: "00000000-0000-4000-8000-000000000101", reason: "Required for duties", idempotencyKey: "00000000-0000-4000-8000-000000000201" });
    assert.deepEqual(calls.map(({ url, init }) => [url, init?.method]), [
      ["http://localhost:7071/api/portal/catalog", "GET"],
      ["http://localhost:7071/api/portal/requests", "POST"],
    ]);
    assert.equal((calls[1]?.init?.headers as Record<string, string>).authorization, "Bearer synthetic-token");
  } finally { globalThis.fetch = original; }
});

test("Portal request client exposes only sanitized API error code and status", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { "content-type": "application/json" } })) as typeof fetch;
  try {
    const client = new PortalRequestApiClient(async () => "synthetic-token", "http://localhost:7071/api");
    await assert.rejects(client.list(), (error) => error instanceof PortalRequestApiError && error.status === 400 && error.code === "invalid_request");
  } finally { globalThis.fetch = original; }
});
