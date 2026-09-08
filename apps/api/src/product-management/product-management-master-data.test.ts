import assert from "node:assert/strict";
import test from "node:test";
import { createProductManagementMasterDataService, MockProductManagementMasterDataAdapter, ProductManagementMasterDataConfigurationError, ProductManagementMasterDataService, ProductManagementMasterDataValidationError } from "./product-management-master-data.js";

test("mock adapter maps countries topics forms and dependency-filtered lookups", async () => {
  const service = new ProductManagementMasterDataService(new MockProductManagementMasterDataAdapter());
  assert.deepEqual((await service.countries()).countries.map((item) => item.value), ["Thailand", "Vietnam"]);
  assert.deepEqual((await service.topics("Thailand")).topics.map((item) => item.value), ["New Product", "Product Change"]);
  const form = await service.form("Thailand", "New Product"); assert.equal(form.source, "MOCK"); assert.ok(form.fields.some((field) => field.lookup === "package" && field.dependsOn?.includes("providerType")));
  assert.deepEqual((await service.lookup("package", { country: "Thailand", topic: "New Product", providerType: "Distributor" })).options.map((item) => item.value), ["Partner"]);
  await assert.rejects(service.lookup("package", { country: "Thailand", topic: "New Product" }), ProductManagementMasterDataValidationError);
});

test("configuration mode is explicit and real mode never silently falls back", async () => {
  assert.equal((await createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "mock" }).countries()).source, "MOCK");
  assert.equal((await createProductManagementMasterDataService({ APP_ENV: "development" }).countries()).source, "MOCK");
  assert.throws(() => createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "real" }), ProductManagementMasterDataConfigurationError);
  assert.throws(() => createProductManagementMasterDataService({ APP_ENV: "production" }), ProductManagementMasterDataConfigurationError);
  assert.throws(() => createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "unexpected" }), ProductManagementMasterDataConfigurationError);
});
