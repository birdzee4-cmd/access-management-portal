import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedProductManagementContext,
  listMockProductManagementRequests,
  mockProductManagementForm,
  productManagementCountries,
  productManagementSchemaRegistry,
  productManagementTopics,
  submitMockProductManagementRequest,
} from "./mock-product-management.js";

const confirmedCountries = ["Thailand", "Philippines", "Vietnam", "Malaysia", "Indonesia"];
const confirmedTopics = [
  "Create New Account (ลูกค้าใหม่)",
  "เพิ่ม Email เข้า Account(ลูกค้า)",
  "เพิ่ม Email(พนักงาน) เข้า Account(ลูกค้า)",
  "เพิ่ม App เข้า Account(ลูกค้า)",
  "ขอสิทธิ์เข้า Role(พนักงาน)",
  "เพิ่ม App เข้า Role(พนักงาน)",
  "เพิ่ม Permission เข้า Role(ลูกค้า)",
  "เพิ่ม Package Add On(ลูกค้า)",
  "Create New Role สำหรับ Account(ลูกค้า)",
  "เปลี่ยน Provider สำหรับ Account(ลูกค้า)",
  "Tranfer Owner Account(ลูกค้า)",
  "ลบ User ใน Account(ลูกค้า)",
  "ขอเปิด/ปิดแจ้งเตือนการเปลี่ยนสิทธิ์ถึง Owner Account",
];

test("mock uses exactly the five confirmed Countries and thirteen Topics in source order", () => {
  assert.deepEqual(productManagementCountries, confirmedCountries);
  assert.deepEqual(productManagementTopics, confirmedTopics);
  assert.equal(productManagementSchemaRegistry.length, 13);
  assert.deepEqual(productManagementSchemaRegistry.map((entry) => entry.topic), confirmedTopics);
});

test("every Country and Topic resolves through the evidence-based schema registry", () => {
  for (const country of productManagementCountries) {
    for (const topic of productManagementTopics) {
      assert.equal(isSupportedProductManagementContext(country, topic), true);
      const form = mockProductManagementForm(country, topic);
      assert.equal(form.country, country);
      assert.equal(form.topic, topic);
      assert.equal(form.schema.implementationStatus, "PARTIAL");
      assert.ok(form.schema.partialReasons.length > 0);
      assert.ok(form.schema.legacyScreenPattern);
      assert.match(form.schema.legacyFormPattern, /USR_PowerApp/);
      assert.deepEqual(form.schema.lookupRequirements, form.fields.flatMap((field) => field.lookup ? [field.lookup] : []));
      assert.ok(form.fields.every((field) => field.requiredness && field.multiplicity && field.legacyDataField && field.legacyLabel));
      assert.ok(form.fields.every((field) => field.legacyControl && field.legacyBinding && field.legacyDefault));
      assert.ok(form.fields.every((field) => field.legacyVisibility && field.portalHandling && field.submitDestination));
      assert.ok(form.fields.every((field) => field.required === (field.requiredness === "CONFIRMED_REQUIRED")));
    }
  }
});

test("registry records discovered multiplicity, missing legacy fields, and reused destinations", () => {
  const byTopic = new Map(productManagementSchemaRegistry.map((entry) => [entry.topic, entry]));
  const createAccount = byTopic.get(productManagementTopics[0])!;
  assert.equal(createAccount.fields.find((field) => field.key === "appName")?.multiplicity, "MULTIPLE");
  assert.equal(createAccount.fields.find((field) => field.key === "packageAddOn")?.requiredness, "CONFIRMED_OPTIONAL");
  assert.ok(createAccount.partialReasons.includes("UNKNOWN_SUBMISSION_MAPPING"));

  const addAppToInternalRole = byTopic.get(productManagementTopics[5])!;
  assert.equal(addAppToInternalRole.fields.find((field) => field.key === "appName")?.requiredness, "CONFIRMED_OPTIONAL");
  assert.ok(addAppToInternalRole.partialReasons.includes("LEGACY_REQUIREDNESS_ANOMALY"));

  const createRole = byTopic.get(productManagementTopics[8])!;
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.requiredness, "CONFIRMED_REQUIRED");
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.multiplicity, "DELIMITED_TEXT");

  const changeProvider = byTopic.get(productManagementTopics[9])!;
  assert.equal(changeProvider.fields.find((field) => field.key === "emailList")?.requiredness, "CONFIRMED_REQUIRED");
  assert.match(changeProvider.fields.find((field) => field.key === "providerType")?.transformation ?? "", /Reuses RoleName/);

  const addOn = byTopic.get(productManagementTopics[7])!;
  assert.match(addOn.fields.find((field) => field.key === "customerRole")?.submitDestination ?? "", /ProductName/);
  assert.match(addOn.fields.find((field) => field.key === "packageAddOn")?.submitDestination ?? "", /AppName/);
});

test("schema dependencies contain Account to Customer Role and no obsolete synthetic chains", () => {
  const fields = productManagementSchemaRegistry.flatMap((entry) => entry.fields);
  const customerRoles = fields.filter((field) => field.lookup === "customerRole");
  assert.ok(customerRoles.length > 0);
  assert.ok(customerRoles.every((field) => JSON.stringify(field.dependsOn) === JSON.stringify(["account"])));
  for (const field of fields.filter((candidate) => candidate.lookup !== "customerRole")) {
    assert.equal(field.dependsOn, undefined);
  }
  assert.ok(!fields.some((field) => field.dependsOn?.includes("providerType")));
  assert.ok(!fields.some((field) => field.dependsOn?.includes("package")));
  assert.ok(!fields.some((field) => field.dependsOn?.includes("appName")));
  const internalRoles = fields.filter((field) => field.lookup === "internalRole");
  assert.ok(internalRoles.length > 0);
  assert.ok(internalRoles.every((field) => field.serverResolvedBy === "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER"));
});

test("mock request history uses only confirmed contexts and PARTIAL schemas cannot submit", () => {
  const result = listMockProductManagementRequests();
  assert.equal(result.source, "MOCK");
  assert.equal(result.requests.length, 2);
  for (const row of result.requests) {
    assert.ok(confirmedCountries.includes(row.country));
    assert.ok(confirmedTopics.includes(row.topic));
    assert.equal(row.system, "Product Management");
  }
  assert.throws(() => submitMockProductManagementRequest({
    country: "Thailand",
    topic: productManagementTopics[0],
    fields: { companyName: "Synthetic Company" },
    idempotencyKey: "synthetic",
  }, "Synthetic"), /PRODUCT_MANAGEMENT_SCHEMA_NOT_CONFIRMED/);
});

test("invalid Country and Topic contexts fail closed", () => {
  for (const [country, topic] of [
    ["", productManagementTopics[0]],
    ["Thailand", ""],
    ["Unsupported", productManagementTopics[0]],
    ["Thailand", "Unsupported"],
  ]) {
    assert.equal(isSupportedProductManagementContext(country ?? "", topic ?? ""), false);
    assert.throws(() => mockProductManagementForm(country ?? "", topic ?? ""));
  }
});
