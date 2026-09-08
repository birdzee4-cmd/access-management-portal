import assert from "node:assert/strict";
import test from "node:test";
import { ProductManagementApiClient } from "./productManagementApi.js";

test("Product Management client requests API-backed countries topics forms and dependent lookups", async () => {
  const originalFetch = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = (async (input) => { calls.push(String(input)); return new Response(JSON.stringify({ source: "MOCK", countries: [], topics: [], fields: [], options: [] }), { status: 200, headers: { "content-type": "application/json" } }); }) as typeof fetch;
  try {
    const client = new ProductManagementApiClient(async () => "synthetic-token", "http://localhost:7071/api");
    await client.countries(); await client.topics("Thailand"); await client.form("Thailand", "New Product"); await client.lookup("package", { country: "Thailand", topic: "New Product", providerType: "Manufacturer" });
    assert.deepEqual(calls, [
      "http://localhost:7071/api/product-management/countries",
      "http://localhost:7071/api/product-management/countries/Thailand/topics",
      "http://localhost:7071/api/product-management/forms/Thailand/New%20Product",
      "http://localhost:7071/api/product-management/lookups/package?country=Thailand&topic=New+Product&providerType=Manufacturer",
    ]);
  } finally { globalThis.fetch = originalFetch; }
});
