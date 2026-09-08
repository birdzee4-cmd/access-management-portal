import type { ProductManagementFormDefinition, ProductManagementRequestListResponse, ProductManagementRequestSubmissionResponse } from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { AuthenticationService, type AuthenticatedUser } from "../auth/index.js";
import { handleProductManagementForm, handleProductManagementList, handleProductManagementSubmit, type ProductManagementApiDependencies, type ProductManagementHttpRequest } from "./product-management-api.js";

const viewer: AuthenticatedUser = { entraObjectId: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.invalid", displayName: "Synthetic User", roles: ["Viewer"], claims: {}, authenticationSource: "ENTRA" };
const authenticated = new AuthenticationService({ validate: async () => viewer });
const dependencies = (authentication = authenticated): ProductManagementApiDependencies => ({ getAuthenticationService: () => authentication });
const request = (body: unknown = {}, params: Readonly<Record<string, string | undefined>> = {}): ProductManagementHttpRequest => ({ headers: { get: (name) => name.toLowerCase() === "authorization" ? "Bearer synthetic" : null }, params, json: async () => body });

test("list returns authenticated mock requests compatible with the response contract", async () => {
  const response = await handleProductManagementList(request(), dependencies());
  assert.equal(response.status, 200); assert.equal((response.headers as Record<string, string>)["cache-control"], "no-store");
  const body: ProductManagementRequestListResponse = response.jsonBody as ProductManagementRequestListResponse;
  assert.equal(body.source, "MOCK"); assert.ok(body.requests.length > 0); assert.ok(body.requests.every((row) => row.system === "Product Management"));
});

test("supported Country and Topic combinations return dynamic form contracts", async () => {
  for (const [country, topic, firstKey] of [["Thailand", "New Product", "productName"], ["Thailand", "Product Change", "changeSummary"], ["Vietnam", "New Product", "productName"], ["Vietnam", "Product Change", "changeSummary"]] as const) {
    const response = await handleProductManagementForm(request({}, { country, topic }), dependencies());
    assert.equal(response.status, 200); const body: ProductManagementFormDefinition = response.jsonBody as ProductManagementFormDefinition;
    assert.equal(body.country, country); assert.equal(body.topic, topic); assert.equal(body.fields[0]?.key, firstKey); assert.ok(body.fields.some((field) => field.required));
  }
});

test("form rejects missing or unsupported Country and Topic with HTTP 400", async () => {
  for (const params of [{}, { country: "Thailand" }, { topic: "New Product" }, { country: "Unsupported", topic: "New Product" }, { country: "Thailand", topic: "Unsupported" }]) {
    const response = await handleProductManagementForm(request({}, params), dependencies()); assert.equal(response.status, 400); assert.deepEqual(response.jsonBody, { error: "invalid_product_management_request" });
  }
});

test("submit returns HTTP 201 contract and rejects missing required input with HTTP 400", async () => {
  const valid = { country: "Thailand", topic: "New Product", fields: { productName: "Synthetic", description: "Synthetic description" }, idempotencyKey: "synthetic-key" };
  const response = await handleProductManagementSubmit(request(valid), dependencies()); assert.equal(response.status, 201);
  const body: ProductManagementRequestSubmissionResponse = response.jsonBody as ProductManagementRequestSubmissionResponse;
  assert.equal(body.source, "MOCK"); assert.equal(body.request.requester, viewer.displayName); assert.equal(body.request.workId, null);
  for (const invalid of [{}, { ...valid, country: "" }, { ...valid, topic: "Unsupported" }, { ...valid, idempotencyKey: "" }, { ...valid, fields: {} }, { ...valid, fields: { productName: "Synthetic", description: 42 } }, { ...valid, unexpected: true }]) {
    assert.equal((await handleProductManagementSubmit(request(invalid), dependencies())).status, 400);
  }
});

test("authentication and authorization remain authoritative", async () => {
  const missing: ProductManagementHttpRequest = { headers: { get: () => null }, params: {}, json: async () => ({}) };
  assert.equal((await handleProductManagementList(missing, dependencies())).status, 401);
  const noRole = new AuthenticationService({ validate: async () => ({ ...viewer, roles: [] }) });
  assert.equal((await handleProductManagementList(request(), dependencies(noRole))).status, 403);
});
