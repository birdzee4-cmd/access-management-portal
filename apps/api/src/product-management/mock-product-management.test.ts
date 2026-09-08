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
      assert.ok(form.schema.legacyScreenPattern);
      assert.match(form.schema.legacyFormPattern, /USR_PowerApp/);
      assert.deepEqual(form.schema.lookupRequirements, form.fields.flatMap((field) => field.lookup ? [field.lookup] : []));
    }
  }
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

test("mock request history and submission use only confirmed contexts", () => {
  const result = listMockProductManagementRequests();
  assert.equal(result.source, "MOCK");
  assert.equal(result.requests.length, 2);
  for (const row of result.requests) {
    assert.ok(confirmedCountries.includes(row.country));
    assert.ok(confirmedTopics.includes(row.topic));
    assert.equal(row.system, "Product Management");
  }
  const submission = submitMockProductManagementRequest({
    country: "Thailand",
    topic: productManagementTopics[0],
    fields: { companyName: "Synthetic Company" },
    idempotencyKey: "synthetic",
  }, "Synthetic");
  assert.equal(submission.request.status, "SUBMITTED");
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
