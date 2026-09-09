import assert from "node:assert/strict";
import test from "node:test";
import {
  DisabledProductManagementSubmissionAdapter,
  ProductManagementCompatibilityError,
  ProductManagementCompatibilityPreviewService,
  ProductManagementRuntimeSafetyError,
  legacyProductManagementFieldNames,
  readProductManagementRuntimeSafety,
  serializeProductManagementCompatibilityPayload,
  validateProductManagementCompatibilityPayload,
  type LegacyProductManagementPayload,
  type ProductManagementCompatibilityInput,
} from "./product-management-compatibility.js";
import { productManagementCompatibilityFixtures } from "./product-management-compatibility.fixtures.js";
import { productManagementSchemaRegistry, productManagementTopics } from "./product-management-model.js";

const commonFields = {
  ID_Employee: "Synthetic Requester PM05",
  Company_: "Synthetic Organization PM05",
  Department: "Synthetic Department PM05",
  Sysytem_: "Product Management",
  Title: "requester.pm05@example.invalid",
  Country: "Thailand",
  Type_ALL: "Product Management",
  Sub_Type: "Product Management",
  Impact_Case: "User Request",
  AssignTo: "routing.pm05@example.invalid",
} as const;

function clone(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

function assertCompatibilityError(action: () => unknown, expectedCode: string): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ProductManagementCompatibilityError);
    assert.ok(error.errors.some((item) => item.includes(expectedCode)), `Expected ${expectedCode}; received ${error.errors.join(", ")}`);
    return true;
  });
}

test("all 13 confirmed Topics have exact deterministic serializers and passing dry-run previews", () => {
  assert.equal(productManagementCompatibilityFixtures.length, 13);
  assert.deepEqual(productManagementCompatibilityFixtures.map((fixture) => fixture.input.topic), [...productManagementTopics]);
  assert.equal(productManagementSchemaRegistry.filter((schema) => schema.implementationStatus === "CONFIRMED").length, 13);

  for (const fixture of productManagementCompatibilityFixtures) {
    const payload = serializeProductManagementCompatibilityPayload(fixture.input);
    assert.deepEqual(payload, {
      ...commonFields,
      Topic_Request: fixture.input.topic,
      Detail: fixture.expectedDetail,
      ...fixture.expectedTopicFields,
    }, fixture.name);
    assert.deepEqual(validateProductManagementCompatibilityPayload(fixture.input, payload), [], fixture.name);

    const preview = new ProductManagementCompatibilityPreviewService({ NODE_ENV: "test" }).preview(fixture.input);
    assert.equal(preview.mode, "DRY_RUN");
    assert.equal(preview.sourceContractStatus, "CONFIRMED");
    assert.equal(preview.validation.status, "PASS");
    assert.equal(preview.submissionAllowed, false);
    assert.equal(preview.adapterEnabled, false);
    assert.equal(preview.portalApprovalCreated, false);
    assert.deepEqual(preview.sideEffects, { network: false, databaseWrite: false, legacyWrite: false, approvalTask: false, auditEvent: false, provisioningTask: false });
    assert.ok(preview.serializationWarnings.includes("DRY_RUN_NOT_SUBMITTED"));
    assert.equal(Object.keys(preview.mappedLegacyFields).length + preview.omittedFields.length, legacyProductManagementFieldNames.length);
  }
});

test("email array is canonical, validated, deduplicated, and serialized only at the compatibility boundary", () => {
  const fixture = productManagementCompatibilityFixtures[1];
  const payload = serializeProductManagementCompatibilityPayload(fixture.input);
  assert.equal(payload["Emailลูกค้า(Product)"], "first.customer@example.invalid, second.customer@example.invalid");
  assert.ok(payload.Detail.includes("first.customer@example.invalid, second.customer@example.invalid"));

  const duplicate = clone(fixture.input);
  duplicate.fields.customerEmails = ["duplicate@example.invalid", " DUPLICATE@example.invalid "];
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(duplicate), "DUPLICATE_NORMALIZED_EMAIL");

  const invalid = clone(fixture.input);
  invalid.fields.customerEmails = ["not-an-email"];
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(invalid), "INVALID_EMAIL");
});

test("App is required and exact App ID/display serialization retains the legacy trailing delimiter", () => {
  const fixture = productManagementCompatibilityFixtures[5];
  const payload = serializeProductManagementCompatibilityPayload(fixture.input);
  assert.equal(payload["AppName(Product)"], "[ SYN-APP-001 ] Synthetic App A , [ SYN-APP-002 ] Synthetic App B , ");
  const missing = clone(fixture.input);
  missing.fields.apps = [];
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(missing), "fields.apps:REQUIRED_ARRAY");
});

test("internal Role eligibility requires Active=true, resolved Manager context, and stable unambiguous keys", () => {
  const fixture = productManagementCompatibilityFixtures[4];

  const inactive = clone(fixture.input);
  inactive.fields.internalRoles[0].active = false;
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(inactive), "ACTIVE_NOT_TRUE");

  const unknown = clone(fixture.input);
  unknown.fields.internalRoles[0].active = "UNKNOWN";
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(unknown), "ACTIVE_NOT_TRUE");

  const managerUnresolved = clone(fixture.input);
  managerUnresolved.fields.internalRoles[0].managerResolution = "UNRESOLVED";
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(managerUnresolved), "MANAGER_UNRESOLVED");

  const missingStableKey = clone(fixture.input);
  missingStableKey.fields.internalRoles[0].stableKey = "";
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(missingStableKey), "stableKey:REQUIRED");

  const duplicate = clone(productManagementCompatibilityFixtures[5].input);
  duplicate.fields.internalRoles = [duplicate.fields.internalRoles[0], duplicate.fields.internalRoles[0]];
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(duplicate), "DUPLICATE_STABLE_KEY");

  const duplicateName = clone(productManagementCompatibilityFixtures[5].input);
  duplicateName.fields.internalRoles = [duplicateName.fields.internalRoles[0], { ...duplicateName.fields.internalRoles[0], stableKey: "synthetic-internal-role-002" }];
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(duplicateName), "DUPLICATE_ROLE_NAME_AMBIGUOUS");
});

test("all-Account-Roles filters by Account, preserves source order, and removes the final delimiter", () => {
  const payload = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[3].input);
  assert.ok(payload.Detail.endsWith("Role Name : Synthetic Customer Role A, Synthetic Customer Role B"));
  assert.ok(!payload.Detail.includes("Synthetic Other Account Role"));
  assert.ok(!payload.Detail.endsWith(", "));
});

test("raw featureList and emailList text passes through without trimming, parsing, or repair", () => {
  const feature = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[6].input);
  assert.ok(feature.Detail.endsWith("Feature-A; Feature-B\nkeep raw spacing"));
  const email = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[11].input);
  assert.ok(email.Detail.endsWith("remove.one@example.invalid ,  remove.two@example.invalid"));
});

test("owner-approved overloaded fields and intentional omission boundaries are exact", () => {
  const create = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[0].input);
  assert.equal(create["PackageHid(Product)"], "Synthetic Add-On A , Synthetic Add-On B , ");
  assert.ok(!create.Detail.includes("Synthetic Add-On"));
  const missingCreateAddOn = { ...create, "PackageHid(Product)": undefined };
  assert.ok(validateProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[0].input, missingCreateAddOn).includes("PackageHid(Product):MISSING"));
  const noOptionalAddOn = clone(productManagementCompatibilityFixtures[0].input);
  noOptionalAddOn.fields.packageAddOns = [];
  const noOptionalPayload = serializeProductManagementCompatibilityPayload(noOptionalAddOn);
  assert.equal(noOptionalPayload["PackageHid(Product)"], undefined);
  assert.ok(new ProductManagementCompatibilityPreviewService().preview(noOptionalAddOn).omittedFields.includes("PackageHid(Product)"));

  const addOn = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[7].input);
  assert.equal(addOn["ProductName(Product)"], "Synthetic Customer Role A, Synthetic Customer Role B, ");
  assert.equal(addOn["AppName(Product)"], "Synthetic Add-On A , Synthetic Add-On B , ");

  const changeProvider = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[9].input);
  assert.equal(changeProvider["RoleName(Product)"], "SAML");
  assert.ok(changeProvider.Detail.includes("Name Provider Type (New) : SAML"));

  const transfer = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[10].input);
  assert.equal(transfer["RoleName(Product)"], "Google");
  assert.equal(transfer["Emailลูกค้า(Product)"], undefined);
  assert.ok(transfer.Detail.endsWith("Email : customer.owner@example.invalid"));

  const notification = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[12].input);
  assert.equal(Object.keys(notification).filter((key) => key.endsWith("(Product)")).join(","), "AccountName(Product)");
  assert.ok(notification.Detail.endsWith("Send Email BCC to Owner Account : เปิด"));
});

test("payload comparison rejects unknown, forbidden, missing, delimiter, Detail, and destination changes", () => {
  const fixture = productManagementCompatibilityFixtures[7];
  const payload = serializeProductManagementCompatibilityPayload(fixture.input);
  const unknown = { ...payload, Manager: "synthetic" } as LegacyProductManagementPayload;
  assert.ok(validateProductManagementCompatibilityPayload(fixture.input, unknown).includes("Manager:UNKNOWN_LEGACY_FIELD"));

  const forbidden = { ...payload, "RoleName(Product)": "wrong destination" };
  assert.ok(validateProductManagementCompatibilityPayload(fixture.input, forbidden).includes("RoleName(Product):FORBIDDEN_FOR_TOPIC"));

  const missing = { ...payload, "ProductName(Product)": "" };
  assert.ok(validateProductManagementCompatibilityPayload(fixture.input, missing).includes("ProductName(Product):MISSING"));

  const delimiter = { ...payload, "AppName(Product)": "Synthetic Add-On A, Synthetic Add-On B" };
  assert.ok(validateProductManagementCompatibilityPayload(fixture.input, delimiter).includes("AppName(Product):SERIALIZATION_MISMATCH"));

  const detail = { ...payload, Detail: `${payload.Detail} silently repaired` };
  assert.ok(validateProductManagementCompatibilityPayload(fixture.input, detail).includes("Detail:SERIALIZATION_MISMATCH"));
});

test("runtime safety fails closed for real mode or any attempt to enable submission/adapter", () => {
  assert.deepEqual(readProductManagementRuntimeSafety({}), { dataSource: "MOCK", submissionEnabled: false, adapterEnabled: false });
  for (const environment of [
    { PRODUCT_MANAGEMENT_DATA_SOURCE: "real" },
    { PRODUCT_MANAGEMENT_DATA_SOURCE: "unknown" },
    { PRODUCT_MANAGEMENT_SUBMISSION_ENABLED: "true" },
    { PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED: "true" },
  ]) {
    assert.throws(() => readProductManagementRuntimeSafety(environment), ProductManagementRuntimeSafetyError);
    assert.throws(() => new ProductManagementCompatibilityPreviewService(environment), ProductManagementRuntimeSafetyError);
  }
  const preview = new ProductManagementCompatibilityPreviewService({ ENABLE_SHAREPOINT_WRITE: "true", ENABLE_LEGACY_SQL_WRITE: "true", ENABLE_VSTS_WRITE: "true", ENABLE_AUTOMATION: "true" }).preview(productManagementCompatibilityFixtures[0].input);
  assert.equal(preview.submissionAllowed, false);
  assert.equal(preview.adapterEnabled, false);
});

test("disabled adapter has no success path and preview performs no network or write action", async () => {
  const payload = serializeProductManagementCompatibilityPayload(productManagementCompatibilityFixtures[0].input);
  const adapter = new DisabledProductManagementSubmissionAdapter();
  assert.equal(adapter.mode, "DISABLED");
  await assert.rejects(adapter.submit(payload), ProductManagementRuntimeSafetyError);

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error("network forbidden"); };
  try {
    const preview = new ProductManagementCompatibilityPreviewService().preview(productManagementCompatibilityFixtures[0].input);
    assert.equal(preview.submissionAllowed, false);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("unknown Topic/field and browser-supplied identity or approval data fail closed", () => {
  const fixture = productManagementCompatibilityFixtures[0];
  const unknownTopic = { ...clone(fixture.input), topic: "Unsupported Topic" } as unknown as ProductManagementCompatibilityInput;
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(unknownTopic), "topic:UNSUPPORTED");

  const unknownField = clone(fixture.input) as ProductManagementCompatibilityInput & { fields: Record<string, unknown> };
  unknownField.fields.approver = "Synthetic Manager";
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(unknownField), "UNKNOWN_OR_MISSING_FIELDS");

  const untrustedIdentity = clone(fixture.input);
  untrustedIdentity.serverContext.source = "BROWSER";
  assertCompatibilityError(() => serializeProductManagementCompatibilityPayload(untrustedIdentity), "serverContext.source:UNTRUSTED");
});
