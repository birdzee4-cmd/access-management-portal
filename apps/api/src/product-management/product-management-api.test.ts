import type {
  ProductManagementCountriesResponse,
  ProductManagementFormDefinition,
  ProductManagementLookupResponse,
  ProductManagementRequestListResponse,
  ProductManagementTopicsResponse,
} from "@access-portal/contracts";
import assert from "node:assert/strict";
import test from "node:test";
import { AuthenticationService, type AuthenticatedUser } from "../auth/index.js";
import {
  handleProductManagementCountries,
  handleProductManagementForm,
  handleProductManagementList,
  handleProductManagementLookup,
  handleProductManagementSubmit,
  handleProductManagementTopics,
  type ProductManagementApiDependencies,
  type ProductManagementHttpRequest,
} from "./product-management-api.js";
import {
  MockProductManagementMasterDataAdapter,
  ProductManagementMasterDataConfigurationError,
  ProductManagementMasterDataService,
} from "./product-management-master-data.js";
import { productManagementCountries, productManagementTopics } from "./product-management-model.js";

const viewer: AuthenticatedUser = { entraObjectId: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.invalid", displayName: "Synthetic User", roles: ["Viewer"], claims: {}, authenticationSource: "ENTRA" };
const authenticated = new AuthenticationService({ validate: async () => viewer });
const masterData = new ProductManagementMasterDataService(new MockProductManagementMasterDataAdapter());
const dependencies = (authentication = authenticated, service = masterData): ProductManagementApiDependencies => ({ getAuthenticationService: () => authentication, getMasterDataService: () => service });
const request = (body: unknown = {}, params: Readonly<Record<string, string | undefined>> = {}, query = new URLSearchParams()): ProductManagementHttpRequest => ({ headers: { get: (name) => name.toLowerCase() === "authorization" ? "Bearer synthetic" : null }, params, query, json: async () => body });
const query = (country: string, topic: string, extra: Record<string, string> = {}) => new URLSearchParams({ country, topic, ...extra });
const optionValues = (response: { readonly jsonBody?: unknown }) => ((response.jsonBody as ProductManagementLookupResponse).options.map((item) => item.value));

test("list returns authenticated mock requests compatible with the response contract", async () => {
  const response = await handleProductManagementList(request(), dependencies());
  assert.equal(response.status, 200);
  assert.equal((response.headers as Record<string, string>)["cache-control"], "no-store");
  const body: ProductManagementRequestListResponse = response.jsonBody as ProductManagementRequestListResponse;
  assert.equal(body.source, "MOCK");
  assert.ok(body.requests.length > 0);
  assert.ok(body.requests.every((row) => row.system === "Product Management" && productManagementCountries.includes(row.country as never) && productManagementTopics.includes(row.topic as never)));
});

test("countries and Topics responses expose the exact confirmed model for every Country", async () => {
  const countriesResponse = await handleProductManagementCountries(request(), dependencies());
  assert.equal(countriesResponse.status, 200);
  const countries: ProductManagementCountriesResponse = countriesResponse.jsonBody as ProductManagementCountriesResponse;
  assert.equal(countries.source, "MOCK");
  assert.deepEqual(countries.countries.map((item) => item.value), [...productManagementCountries]);

  for (const country of productManagementCountries) {
    const topicsResponse = await handleProductManagementTopics(request({}, { country }), dependencies());
    assert.equal(topicsResponse.status, 200);
    const topics: ProductManagementTopicsResponse = topicsResponse.jsonBody as ProductManagementTopicsResponse;
    assert.equal(topics.country, country);
    assert.deepEqual(topics.topics.map((item) => item.value), [...productManagementTopics]);
  }
});

test("all 65 Country and Topic pairs return compatible schema registry contracts", async () => {
  let confirmed = 0;
  let partial = 0;
  for (const country of productManagementCountries) {
    for (const topic of productManagementTopics) {
      const response = await handleProductManagementForm(request({}, { country, topic }), dependencies());
      assert.equal(response.status, 200);
      const body: ProductManagementFormDefinition = response.jsonBody as ProductManagementFormDefinition;
      assert.equal(body.source, "MOCK");
      assert.equal(body.country, country);
      assert.equal(body.topic, topic);
      if (body.schema.implementationStatus === "CONFIRMED") confirmed += 1;
      if (body.schema.implementationStatus === "PARTIAL") partial += 1;
      assert.equal(body.schema.partialReasons.length === 0, body.schema.implementationStatus === "CONFIRMED");
      assert.equal(body.schema.submissionEnabled, false);
      assert.ok(body.schema.legacyScreenPattern);
      assert.ok(body.fields.length > 0);
    }
  }
  assert.equal(confirmed, 65);
  assert.equal(partial, 0);
});

test("lookup endpoints implement Country partitions, shared Product and Account to Customer Role", async () => {
  const topic = productManagementTopics[0];
  const thailandPackage = await handleProductManagementLookup(request({}, { lookup: "package" }, query("Thailand", topic)), dependencies());
  const philippinesPackage = await handleProductManagementLookup(request({}, { lookup: "package" }, query("Philippines", topic)), dependencies());
  assert.equal(thailandPackage.status, 200);
  assert.equal(philippinesPackage.status, 200);
  assert.notDeepEqual(optionValues(thailandPackage), optionValues(philippinesPackage));

  const thailandProduct = await handleProductManagementLookup(request({}, { lookup: "product" }, query("Thailand", topic)), dependencies());
  const indonesiaProduct = await handleProductManagementLookup(request({}, { lookup: "product" }, query("Indonesia", topic)), dependencies());
  assert.deepEqual(optionValues(thailandProduct), optionValues(indonesiaProduct));

  const accounts = await handleProductManagementLookup(request({}, { lookup: "account" }, query("Malaysia", topic)), dependencies());
  const account = optionValues(accounts)[0];
  assert.ok(account);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "customerRole" }, query("Malaysia", topic)), dependencies())).status, 400);
  const roles = await handleProductManagementLookup(request({}, { lookup: "customerRole" }, query("Malaysia", topic, { account })), dependencies());
  assert.equal(roles.status, 200);
  assert.ok(optionValues(roles).length > 0);
});

test("obsolete Provider Package App dependency query values are not required or applied", async () => {
  const topic = productManagementTopics[0];
  for (const [lookup, obsolete] of [
    ["package", { providerType: "SAML" }],
    ["packageAddOn", { package: "Synthetic package" }],
    ["appName", { package: "Synthetic package" }],
    ["account", { appName: "Synthetic app" }],
  ] as const) {
    const withoutObsolete = await handleProductManagementLookup(request({}, { lookup }, query("Thailand", topic)), dependencies());
    const withObsolete = await handleProductManagementLookup(request({}, { lookup }, query("Thailand", topic, obsolete)), dependencies());
    assert.equal(withoutObsolete.status, 200);
    assert.deepEqual(optionValues(withObsolete), optionValues(withoutObsolete));
  }
});

test("invalid or missing Country Topic lookup and Account dependency return HTTP 400", async () => {
  const topic = productManagementTopics[0];
  assert.equal((await handleProductManagementTopics(request({}, { country: "Unsupported" }), dependencies())).status, 400);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "package" }, new URLSearchParams()), dependencies())).status, 400);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "package" }, query("Unsupported", topic)), dependencies())).status, 400);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "package" }, query("Thailand", "Unsupported")), dependencies())).status, 400);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "unknown" }, query("Thailand", topic)), dependencies())).status, 400);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "customerRole" }, query("Thailand", topic)), dependencies())).status, 400);
});

test("form rejects missing or unsupported Country and Topic with HTTP 400", async () => {
  for (const params of [{}, { country: "Thailand" }, { topic: productManagementTopics[0] }, { country: "Unsupported", topic: productManagementTopics[0] }, { country: "Thailand", topic: "Unsupported" }]) {
    const response = await handleProductManagementForm(request({}, params), dependencies());
    assert.equal(response.status, 400);
    assert.deepEqual(response.jsonBody, { error: "invalid_product_management_master_data_request" });
  }
});

test("mock submit rejects PARTIAL schemas, source-closed disabled schemas, and invalid input", async () => {
  const valid = { country: "Thailand", topic: productManagementTopics[0], fields: { companyName: "Synthetic Company" }, idempotencyKey: "synthetic-key" };
  const response = await handleProductManagementSubmit(request(valid), dependencies());
  assert.equal(response.status, 400);
  const sourceClosed = { country: "Thailand", topic: productManagementTopics[6], fields: { account: "Synthetic Account", customerRole: "Synthetic Role", featureList: "Synthetic Feature" }, idempotencyKey: "synthetic-source-closed" };
  assert.equal((await handleProductManagementSubmit(request(sourceClosed), dependencies())).status, 400);
  for (const invalid of [{}, { ...valid, country: "" }, { ...valid, topic: "Unsupported" }, { ...valid, idempotencyKey: "" }, { ...valid, fields: {} }, { ...valid, fields: { unknown: "value" } }, { ...valid, fields: { companyName: 42 } }, { ...valid, unexpected: true }]) {
    assert.equal((await handleProductManagementSubmit(request(invalid), dependencies())).status, 400);
  }
});

test("authentication and authorization remain authoritative", async () => {
  const missing: ProductManagementHttpRequest = { headers: { get: () => null }, params: {}, json: async () => ({}) };
  const noRole = new AuthenticationService({ validate: async () => ({ ...viewer, roles: [] }) });
  assert.equal((await handleProductManagementList(missing, dependencies())).status, 401);
  assert.equal((await handleProductManagementCountries(missing, dependencies())).status, 401);
  assert.equal((await handleProductManagementForm(missing, dependencies())).status, 401);
  assert.equal((await handleProductManagementTopics(request({}, { country: "Thailand" }), dependencies(noRole))).status, 403);
  assert.equal((await handleProductManagementLookup(request({}, { lookup: "package" }, query("Thailand", productManagementTopics[0])), dependencies(noRole))).status, 403);
});

test("real mode remains unavailable with HTTP 503 after authentication", async () => {
  const unavailable = new ProductManagementMasterDataService({ source: "REAL", countries: async () => { throw new ProductManagementMasterDataConfigurationError("Unavailable"); }, topics: async () => [], form: async () => { throw new Error("unused"); }, lookup: async () => [] });
  assert.equal((await handleProductManagementCountries(request(), dependencies(authenticated, unavailable))).status, 503);
});
