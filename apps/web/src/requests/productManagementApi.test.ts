import assert from "node:assert/strict";
import test from "node:test";
import { ProductManagementApiClient } from "./productManagementApi.js";

test("Product Management client requests API-backed countries topics forms and dependent lookups", async () => {
  const originalFetch = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = (async (input) => { calls.push(String(input)); return new Response(JSON.stringify({ source: "MOCK", countries: [], topics: [], fields: [], options: [] }), { status: 200, headers: { "content-type": "application/json" } }); }) as typeof fetch;
  try {
    const client = new ProductManagementApiClient(async () => "synthetic-token", "http://localhost:7071/api");
    const topic = "เพิ่ม Email เข้า Account(ลูกค้า)";
    await client.countries(); await client.topics("Thailand"); await client.form("Thailand", topic); await client.lookup("customerRole", { country: "Thailand", topic, account: "TH Synthetic Account A" });
    assert.deepEqual(calls, [
      "http://localhost:7071/api/product-management/countries",
      "http://localhost:7071/api/product-management/countries/Thailand/topics",
      "http://localhost:7071/api/product-management/forms/Thailand/%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1%20Email%20%E0%B9%80%E0%B8%82%E0%B9%89%E0%B8%B2%20Account(%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%84%E0%B9%89%E0%B8%B2)",
      "http://localhost:7071/api/product-management/lookups/customerRole?country=Thailand&topic=%E0%B9%80%E0%B8%9E%E0%B8%B4%E0%B9%88%E0%B8%A1+Email+%E0%B9%80%E0%B8%82%E0%B9%89%E0%B8%B2+Account%28%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%84%E0%B9%89%E0%B8%B2%29&account=TH+Synthetic+Account+A",
    ]);
  } finally { globalThis.fetch = originalFetch; }
});
