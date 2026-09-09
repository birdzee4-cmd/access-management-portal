import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedProductManagementContext,
  listMockProductManagementRequests,
  mockProductManagementForm,
  normalizeProductManagementCustomerEmails,
  productManagementCountries,
  productManagementOwnerDecisions,
  productManagementPhase1ApprovalArchitecture,
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
const confirmedContractTopics = new Set(confirmedTopics);

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
      const expectedStatus = confirmedContractTopics.has(topic) ? "CONFIRMED" : "PARTIAL";
      assert.equal(form.schema.implementationStatus, expectedStatus);
      assert.equal(form.schema.partialReasons.length === 0, expectedStatus === "CONFIRMED");
      assert.equal(form.schema.submissionEnabled, false);
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
  const createAccountAddOn = createAccount.fields.find((field) => field.key === "packageAddOn")!;
  assert.equal(createAccount.fields.find((field) => field.key === "appName")?.multiplicity, "MULTIPLE");
  assert.equal(createAccountAddOn.requiredness, "CONFIRMED_OPTIONAL");
  assert.equal(createAccountAddOn.legacyDataField, "PackageHid(Product)");
  assert.equal(createAccountAddOn.serialization?.formula, "Concat(PackageAddOn.SelectedItems, DisplayName, \" , \")");
  assert.equal(createAccountAddOn.serialization?.destination, "USR_PowerApp.PackageHid(Product) only");
  assert.match(createAccountAddOn.submitDestination ?? "", /omitted from Detail, Product Management SQL, and VSTS/i);
  assert.match(createAccountAddOn.serialization?.downstreamConsumer ?? "", /no Product Management SQL parameter, Detail fragment, approval payload, or VSTS field/i);
  assert.deepEqual(createAccount.partialReasons, []);
  assert.equal(createAccountAddOn.ownerDecision?.status, "RESOLVED_BY_OWNER");

  const addCustomerEmail = byTopic.get(productManagementTopics[1])!;
  assert.equal(addCustomerEmail.fields.find((field) => field.key === "customerEmail")?.multiplicity, "MULTIPLE");
  assert.match(addCustomerEmail.fields.find((field) => field.key === "customerEmail")?.ownerDecision?.portalCanonicalRepresentation ?? "", /email array/i);

  const addAppToInternalRole = byTopic.get(productManagementTopics[5])!;
  assert.equal(addAppToInternalRole.fields.find((field) => field.key === "appName")?.requiredness, "CONFIRMED_REQUIRED");
  assert.deepEqual(addAppToInternalRole.partialReasons, []);

  const createRole = byTopic.get(productManagementTopics[8])!;
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.requiredness, "CONFIRMED_REQUIRED");
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.multiplicity, "DELIMITED_TEXT");
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.serialization?.mode, "RAW_TEXT_PASSTHROUGH");
  assert.equal(createRole.fields.find((field) => field.key === "featureList")?.serialization?.delimiter, null);

  const changeProvider = byTopic.get(productManagementTopics[9])!;
  assert.equal(changeProvider.fields.find((field) => field.key === "emailList")?.requiredness, "CONFIRMED_REQUIRED");
  assert.match(changeProvider.fields.find((field) => field.key === "providerType")?.transformation ?? "", /reuses RoleName/i);
  const changeProviderValue = changeProvider.fields.find((field) => field.key === "providerType")!;
  assert.equal(changeProviderValue.legacyDataField, "RoleName(Product)");
  assert.match(changeProviderValue.submitDestination ?? "", /SQL\.RoleName.*Detail.*VSTS description/i);
  assert.equal(changeProviderValue.legacyFieldReuse?.decisionId, "PMD-011");
  assert.equal(changeProviderValue.legacyFieldReuse?.downstreamUsageStatus, "DOWNSTREAM_USAGE_CONFIRMED");
  assert.deepEqual(changeProvider.partialReasons, []);

  const addOn = byTopic.get(productManagementTopics[7])!;
  assert.match(addOn.fields.find((field) => field.key === "customerRole")?.submitDestination ?? "", /ProductName/);
  assert.match(addOn.fields.find((field) => field.key === "packageAddOn")?.submitDestination ?? "", /AppName/);
  assert.equal(addOn.fields.find((field) => field.key === "customerRole")?.legacyFieldReuse?.storageStatus, "LEGACY_STORAGE_CONFIRMED");
  assert.equal(addOn.fields.find((field) => field.key === "packageAddOn")?.legacyFieldReuse?.downstreamUsageStatus, "DOWNSTREAM_USAGE_CONFIRMED");
  assert.equal(addOn.fields.find((field) => field.key === "customerRole")?.legacyFieldReuse?.decisionId, "PMD-009");
  assert.equal(addOn.fields.find((field) => field.key === "packageAddOn")?.legacyFieldReuse?.compatibilityDecision, "OWNER_APPROVED_LEGACY_COMPATIBILITY");

  const addAppToAccount = byTopic.get(productManagementTopics[3])!;
  assert.equal(addAppToAccount.derivedValues?.[0]?.serialization.mode, "DERIVED_ACCOUNT_ROLES");
  assert.equal(addAppToAccount.derivedValues?.[0]?.serialization.delimiter, ", ");

  const internalRole = byTopic.get(productManagementTopics[4])!.fields.find((field) => field.key === "internalRole")!;
  assert.equal(internalRole.matrix?.effectiveMatch, "REQUESTER_AS_MANAGER_ELSE_REQUESTER_MANAGER");
  assert.equal(internalRole.matrix?.activeApplied, false);
  assert.equal(internalRole.matrix?.departmentApplied, false);
  assert.equal(internalRole.matrix?.duplicateRoleNameBehavior, "PRESERVED");
  assert.equal(internalRole.matrix?.portalPolicy?.eligibleActiveValue, true);
  assert.equal(internalRole.matrix?.portalPolicy?.unknownActiveBehavior, "FAIL_CLOSED");
  assert.equal(internalRole.matrix?.portalPolicy?.managerUnusableBehavior, "UNRESOLVED");
  assert.equal(internalRole.matrix?.portalPolicy?.duplicateRoleNameBehavior, "REQUIRE_STABLE_KEY_ELSE_FAIL_CLOSED");
  assert.equal(internalRole.matrix?.portalPolicy?.displayOrdering, "DETERMINISTIC_NO_APPROVAL_PRIORITY");
  assert.equal(internalRole.matrix?.portalPolicy?.serverAuthoritative, true);

  const transferOwner = byTopic.get(productManagementTopics[10])!;
  const transferProvider = transferOwner.fields.find((field) => field.key === "providerType")!;
  const transferEmail = transferOwner.fields.find((field) => field.key === "customerEmail")!;
  assert.equal(transferProvider.legacyFieldReuse?.legacyField, "RoleName(Product)");
  assert.equal(transferProvider.legacyFieldReuse?.decisionId, "PMD-012");
  assert.match(transferProvider.submitDestination ?? "", /SQL\.RoleName.*Detail.*VSTS description/i);
  assert.equal(transferEmail.legacyLabel, "Email ลูกค้า");
  assert.equal(transferEmail.legacyDataField, "Detail");
  assert.match(transferEmail.submitDestination ?? "", /not mapped to SQL\.Email_Customer/i);
  assert.equal(transferEmail.serialization?.formula, "Detail = Topic + Account + NewProvider + \"Email : \" + TextInput.Text");
  assert.match(transferEmail.serialization?.downstreamConsumer ?? "", /no dedicated Transfer Owner email field/i);
  assert.match(transferEmail.ownerDecision?.compatibilityRule ?? "", /never infer Account ownership or identity authority/i);
  assert.doesNotMatch(transferEmail.ownerDecision?.portalCanonicalRepresentation ?? "", /newOwnerEmail/i);
  assert.deepEqual(transferOwner.partialReasons, []);

  const notification = byTopic.get(productManagementTopics[12])!.fields.find((field) => field.key === "notificationSetting")!;
  assert.equal(notification.legacyDataField, "Detail");
  assert.match(notification.ownerDecision?.compatibilityRule ?? "", /Detail-only/);
  assert.match(notification.transformation ?? "", /no typed destination is introduced/i);
});

test("owner decisions are complete and Phase 1 retains one Legacy approval authority", () => {
  assert.equal(productManagementOwnerDecisions.length, 10);
  assert.ok(productManagementOwnerDecisions.every((decision) => decision.status === "RESOLVED_BY_OWNER"));
  assert.deepEqual(productManagementOwnerDecisions.map(({ id, category }) => [id, category]), [
    ["PMD-001", "APPROVE_RECOMMENDATION"],
    ["PMD-002", "APPROVE_RECOMMENDATION"],
    ["PMD-005", "APPROVE_RECOMMENDATION"],
    ["PMD-006", "APPROVE_RECOMMENDATION"],
    ["PMD-007", "APPROVE_RECOMMENDATION"],
    ["PMD-009", "APPROVE_WITH_CHANGE_LEGACY_COMPATIBILITY_FIRST"],
    ["PMD-011", "APPROVE_WITH_CHANGE_LEGACY_COMPATIBILITY_FIRST"],
    ["PMD-012", "APPROVE_WITH_CHANGE_LEGACY_COMPATIBILITY_FIRST"],
    ["PMD-013", "APPROVE_WITH_CHANGE_LEGACY_COMPATIBILITY_FIRST"],
    ["PMD-015", "APPROVE_WITH_CHANGE_LEGACY_COMPATIBILITY_FIRST"],
  ]);
  assert.deepEqual(productManagementPhase1ApprovalArchitecture, {
    phase: "PHASE_1",
    authority: "LEGACY_POWER_AUTOMATE_MICROSOFT_TEAMS",
    portalApprovalEnabled: false,
    doubleApprovalAllowed: false,
    migrationStatus: "OUT_OF_SCOPE",
    runtimeIntegrationActive: false,
  });
  assert.ok(productManagementSchemaRegistry.every((entry) => entry.approvalArchitecture === productManagementPhase1ApprovalArchitecture));
});

test("canonical customer email arrays trim and validate each value", () => {
  assert.deepEqual(normalizeProductManagementCustomerEmails([" first@example.invalid ", "second@example.invalid"]), ["first@example.invalid", "second@example.invalid"]);
  for (const invalid of [[], "first@example.invalid", ["invalid"], ["first@example.invalid", 42]]) {
    assert.throws(() => normalizeProductManagementCustomerEmails(invalid), /CUSTOMER_EMAILS_INVALID/);
  }
  assert.throws(() => normalizeProductManagementCustomerEmails(["First@example.invalid", " first@example.invalid "]), /CUSTOMER_EMAILS_DUPLICATE/);
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
  assert.ok(internalRoles.every((field) => field.serverResolvedBy === "AUTHENTICATED_USER_MANAGER_FALLBACK"));
});

test("mock request history uses supported contexts and submission remains disabled for every confirmed schema", () => {
  const result = listMockProductManagementRequests();
  assert.equal(result.source, "MOCK");
  assert.equal(result.requests.length, 2);
  for (const row of result.requests) {
    assert.ok(confirmedCountries.includes(row.country));
    assert.ok(confirmedTopics.includes(row.topic));
    assert.equal(row.system, "Product Management");
  }
  for (const [index, topic] of productManagementTopics.entries()) {
    assert.throws(() => submitMockProductManagementRequest({
      country: "Thailand",
      topic,
      fields: { synthetic: "Synthetic value" },
      idempotencyKey: `synthetic-disabled-${index}`,
    }, "Synthetic"), /PRODUCT_MANAGEMENT_SUBMISSION_DISABLED/);
  }
});

test("schema registry applies owner decisions and PM-04 verifies all thirteen technical mappings", () => {
  assert.equal(productManagementSchemaRegistry.filter((entry) => entry.implementationStatus === "CONFIRMED").length, 13);
  assert.equal(productManagementSchemaRegistry.filter((entry) => entry.implementationStatus === "PARTIAL").length, 0);
  assert.ok(productManagementSchemaRegistry.every((entry) => entry.submissionEnabled === false));
  assert.ok(productManagementSchemaRegistry.every((entry) => entry.partialReasons.length === 0));
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
