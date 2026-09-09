import assert from "node:assert/strict";
import test from "node:test";
import type { ProductManagementLookupContext } from "@access-portal/contracts";
import {
  createProductManagementMasterDataService,
  MockProductManagementMasterDataAdapter,
  ProductManagementMasterDataConfigurationError,
  ProductManagementMasterDataService,
  ProductManagementMasterDataValidationError,
} from "./product-management-master-data.js";
import { productManagementCountries, productManagementTopics } from "./product-management-model.js";

const service = () => new ProductManagementMasterDataService(new MockProductManagementMasterDataAdapter());
const topic = productManagementTopics[0];
const values = <T extends { readonly value: string }>(items: readonly T[]) => items.map((item) => item.value);

test("mock adapter returns the exact Countries and the same thirteen Topics for every Country", async () => {
  const masterData = service();
  assert.deepEqual(values((await masterData.countries()).countries), [...productManagementCountries]);
  for (const country of productManagementCountries) {
    const response = await masterData.topics(country);
    assert.equal(response.country, country);
    assert.deepEqual(values(response.topics), [...productManagementTopics]);
  }
});

test("all Country and Topic pairs resolve schema registry metadata", async () => {
  const masterData = service();
  let confirmed = 0;
  let partial = 0;
  for (const country of productManagementCountries) {
    for (const currentTopic of productManagementTopics) {
      const form = await masterData.form(country, currentTopic);
      assert.equal(form.source, "MOCK");
      assert.equal(form.country, country);
      assert.equal(form.topic, currentTopic);
      if (form.schema.implementationStatus === "CONFIRMED") confirmed += 1;
      if (form.schema.implementationStatus === "PARTIAL") partial += 1;
      assert.equal(form.schema.partialReasons.length === 0, form.schema.implementationStatus === "CONFIRMED");
      assert.equal(form.schema.submissionEnabled, false);
      assert.ok(form.schema.legacyScreenPattern);
      assert.ok(form.fields.length > 0);
    }
  }
  assert.equal(confirmed, 25);
  assert.equal(partial, 40);
});

test("Package, Add On, App and Account mock values are partitioned by Country", async () => {
  const masterData = service();
  for (const lookup of ["package", "packageAddOn", "appName", "account"] as const) {
    const byCountry = await Promise.all(productManagementCountries.map(async (country) => values((await masterData.lookup(lookup, { country, topic })).options)));
    assert.equal(new Set(byCountry.map((items) => JSON.stringify(items))).size, productManagementCountries.length);
  }
});

test("Product uses one shared mock source behavior across all Countries", async () => {
  const masterData = service();
  const byCountry = await Promise.all(productManagementCountries.map(async (country) => values((await masterData.lookup("product", { country, topic })).options)));
  assert.ok(byCountry[0]?.length);
  for (const current of byCountry.slice(1)) assert.deepEqual(current, byCountry[0]);
});

test("Account is the only client lookup dependency and filters Customer Role", async () => {
  const masterData = service();
  const context = { country: "Thailand", topic };
  const accounts = values((await masterData.lookup("account", context)).options);
  await assert.rejects(masterData.lookup("customerRole", context), ProductManagementMasterDataValidationError);
  const roles = values((await masterData.lookup("customerRole", { ...context, account: accounts[0] })).options);
  assert.ok(roles.length > 0);
  assert.deepEqual(values((await masterData.lookup("customerRole", { ...context, account: "Unknown account" })).options), []);
});

test("unsupported Provider Package App dependency inputs do not alter lookup results", async () => {
  const masterData = service();
  const context = { country: "Thailand", topic };
  const legacyContext = (extra: Readonly<Record<string, string>>): ProductManagementLookupContext => ({ ...context, ...extra });
  assert.deepEqual(
    values((await masterData.lookup("package", context)).options),
    values((await masterData.lookup("package", legacyContext({ providerType: "SAML" }))).options),
  );
  assert.deepEqual(
    values((await masterData.lookup("packageAddOn", context)).options),
    values((await masterData.lookup("packageAddOn", legacyContext({ package: "Synthetic package" }))).options),
  );
  assert.deepEqual(
    values((await masterData.lookup("appName", context)).options),
    values((await masterData.lookup("appName", legacyContext({ package: "Synthetic package" }))).options),
  );
  assert.deepEqual(
    values((await masterData.lookup("account", context)).options),
    values((await masterData.lookup("account", legacyContext({ appName: "Synthetic app" }))).options),
  );
});

test("Provider Type and Internal Role reflect the confirmed hard-coded and Matrix models", async () => {
  const masterData = service();
  assert.deepEqual(values((await masterData.lookup("providerType", { country: "Thailand", topic })).options), [
    "SAML", "Office 365", "Hotmail/Outlook", "Google", "Local Account",
  ]);
  const thailand = values((await masterData.lookup("internalRole", { country: "Thailand", topic })).options);
  const philippines = values((await masterData.lookup("internalRole", { country: "Philippines", topic })).options);
  const vietnam = values((await masterData.lookup("internalRole", { country: "Vietnam", topic })).options);
  assert.notDeepEqual(thailand, philippines);
  assert.notDeepEqual(philippines, vietnam);
  assert.deepEqual(vietnam, values((await masterData.lookup("internalRole", { country: "Malaysia", topic })).options));
  assert.deepEqual(vietnam, values((await masterData.lookup("internalRole", { country: "Indonesia", topic })).options));
});

test("invalid master-data context and lookup names fail closed", async () => {
  const masterData = service();
  await assert.rejects(masterData.topics("Unsupported"), ProductManagementMasterDataValidationError);
  await assert.rejects(masterData.form("Thailand", "Unsupported"), ProductManagementMasterDataValidationError);
  await assert.rejects(masterData.lookup("unknown", { country: "Thailand", topic }), ProductManagementMasterDataValidationError);
  await assert.rejects(masterData.lookup("package", { country: "Unsupported", topic }), ProductManagementMasterDataValidationError);
});

test("configuration mode is explicit and real mode never silently falls back", async () => {
  assert.equal((await createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "mock" }).countries()).source, "MOCK");
  assert.equal((await createProductManagementMasterDataService({ APP_ENV: "development" }).countries()).source, "MOCK");
  assert.throws(() => createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "real" }), ProductManagementMasterDataConfigurationError);
  assert.throws(() => createProductManagementMasterDataService({ APP_ENV: "production" }), ProductManagementMasterDataConfigurationError);
  assert.throws(() => createProductManagementMasterDataService({ PRODUCT_MANAGEMENT_DATA_SOURCE: "unexpected" }), ProductManagementMasterDataConfigurationError);
});
