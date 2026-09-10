import assert from "node:assert/strict";
import test from "node:test";
import { productManagementCompatibilityFixtures } from "./product-management-compatibility.fixtures.js";
import { ProductManagementRuntimeSafetyError, readProductManagementRuntimeSafety } from "./product-management-compatibility.js";
import {
  PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET,
  PRODUCT_MANAGEMENT_PM07_MARKER,
  PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT,
  PRODUCT_MANAGEMENT_PM07_TOPIC,
  ProductManagementControlledAcceptanceRunner,
  ProductManagementControlledAcceptanceSafetyError,
  SharePointProductManagementControlledAcceptanceAdapter,
  createProductManagementControlledAcceptanceDryRun,
  evaluateProductManagementControlledAcceptanceArtifacts,
  readProductManagementControlledAcceptanceConfiguration,
  type ProductManagementControlledAcceptanceAdapter,
  type ProductManagementControlledAcceptanceConfiguration,
  type ProductManagementControlledAcceptanceEnvelopeV1,
  type ProductManagementControlledAcceptanceTargetObservation,
  type ProductManagementControlledAcceptanceVerificationResult,
} from "./product-management-controlled-acceptance.js";

const timestamp = "2026-09-09T10:00:00.000Z";
const approvedRequesterEmail = "pm07.requester@internal.example";
const approvedAssignTo = "pm07.routing@internal.example";

const pm07Input = {
  ...productManagementCompatibilityFixtures[12]!.input,
  serverContext: {
    source: "AUTHENTICATED_SERVER_CONTEXT",
    requesterDisplayName: "Approved PM07 Test User",
    requesterEmail: approvedRequesterEmail,
    department: "Controlled Acceptance",
  },
  legacyConfiguration: {
    source: "APPROVED_SERVER_CONFIGURATION",
    company: "Controlled Acceptance Organization",
    assignTo: approvedAssignTo,
  },
  fields: {
    account: { stableKey: "pm07-controlled-test", displayName: PRODUCT_MANAGEMENT_PM07_MARKER },
    notificationSetting: "ปิด",
  },
} as const;

function reviewedDryRun() {
  return createProductManagementControlledAcceptanceDryRun({
    compatibilityInput: pm07Input,
    correlationId: "pm07-controlled-correlation",
    idempotencyKey: "pm07-controlled-idempotency",
    createdAt: timestamp,
  });
}

function environment(): Record<string, string> {
  return {
    PRODUCT_MANAGEMENT_DATA_SOURCE: "mock",
    PRODUCT_MANAGEMENT_SUBMISSION_ENABLED: "false",
    PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED: "false",
    PRODUCT_MANAGEMENT_ADAPTER_TARGET: "disabled",
    PRODUCT_MANAGEMENT_PM07_MODE: "PM07_SINGLE_REJECT_TEST",
    PRODUCT_MANAGEMENT_PM07_WRITE_AUTHORIZATION: "AUTHORIZED_EXACTLY_ONE_REJECT_TEST",
    PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT,
    PRODUCT_MANAGEMENT_PM07_TARGET_CLASSIFICATION: "PRODUCTION_CONTROLLED_ACCEPTANCE",
    PRODUCT_MANAGEMENT_PM07_TARGET_ATTESTATION: "OFFLINE_POWER_APP_FLOW_TARGET_MATCH_VERIFIED",
    PRODUCT_MANAGEMENT_PM07_LEAST_PRIVILEGE_ATTESTATION: "VERIFIED_BOUNDED_LIST_READ_WRITE",
    PRODUCT_MANAGEMENT_PM07_SHAREPOINT_SITE_URL: "https://synthetic-tenant.sharepoint.com/sites/controlled",
    PRODUCT_MANAGEMENT_PM07_SHAREPOINT_LIST_ID: "11111111-1111-4111-8111-111111111111",
    PRODUCT_MANAGEMENT_PM07_SHAREPOINT_LIST_TITLE: "USR_PowerApp",
    PRODUCT_MANAGEMENT_PM07_MARKER,
    PRODUCT_MANAGEMENT_PM07_TOPIC,
    PRODUCT_MANAGEMENT_PM07_EXPECTED_PAYLOAD_FINGERPRINT: reviewedDryRun().envelope.payloadFingerprint,
    PRODUCT_MANAGEMENT_PM07_IDEMPOTENCY_KEY: "pm07-controlled-idempotency",
    PRODUCT_MANAGEMENT_PM07_APPROVED_REQUESTER_EMAIL: approvedRequesterEmail,
    PRODUCT_MANAGEMENT_PM07_APPROVED_ASSIGN_TO: approvedAssignTo,
    PRODUCT_MANAGEMENT_PM07_APPROVED_COMPANY: "Controlled Acceptance Organization",
  };
}

const targetObservation: ProductManagementControlledAcceptanceTargetObservation = {
  listTitle: "USR_PowerApp",
  baseTemplate: 100,
  hidden: false,
  currentUserEmail: approvedRequesterEmail,
  currentUserDisplayName: "Approved PM07 Test User",
  currentUserPrincipalType: 1,
  existingMarkerMatches: 0,
  fieldInternalNames: {} as ProductManagementControlledAcceptanceTargetObservation["fieldInternalNames"],
};

class FakeControlledAdapter implements ProductManagementControlledAcceptanceAdapter {
  readonly target = PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET;
  readonly configuration: ProductManagementControlledAcceptanceConfiguration;
  readonly capabilities = { submit: true, verify: true, reconcileByMarker: true, network: true,
    approve: false, reject: false, provision: false, revoke: false } as const;
  readonly events: string[] = [];
  submitResult: Awaited<ReturnType<ProductManagementControlledAcceptanceAdapter["submit"]>> = {
    status: "ACCEPTED_BY_ADAPTER",
    downstreamReference: "321",
  };
  verificationResult: ProductManagementControlledAcceptanceVerificationResult = {
    status: "VERIFIED",
    downstreamReference: "321",
  };

  constructor(
    readonly observation = targetObservation,
    configuration = readProductManagementControlledAcceptanceConfiguration(environment()),
  ) {
    this.configuration = configuration;
  }

  async inspectTarget(): Promise<ProductManagementControlledAcceptanceTargetObservation> {
    this.events.push("INSPECT_TARGET");
    return this.observation;
  }

  async submit(): Promise<Awaited<ReturnType<ProductManagementControlledAcceptanceAdapter["submit"]>>> {
    this.events.push("SUBMIT_ONCE");
    return this.submitResult;
  }

  async verify(): Promise<ProductManagementControlledAcceptanceVerificationResult> {
    this.events.push("VERIFY");
    return this.verificationResult;
  }

  async reconcileByMarker(): Promise<ProductManagementControlledAcceptanceVerificationResult> {
    this.events.push("RECONCILE_BY_MARKER");
    return this.verificationResult;
  }
}

test("controlled configuration fails closed unless every explicit PM-07 gate is present", () => {
  assert.throws(() => readProductManagementControlledAcceptanceConfiguration({}), ProductManagementControlledAcceptanceSafetyError);
  for (const [key, value] of [
    ["PRODUCT_MANAGEMENT_SUBMISSION_ENABLED", "true"],
    ["PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED", "true"],
    ["PRODUCT_MANAGEMENT_ADAPTER_TARGET", "production"],
    ["PRODUCT_MANAGEMENT_PM07_TARGET_CLASSIFICATION", "PRODUCTION"],
    ["PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT", "REJECT_AT_FIRST_TEAMS_APPROVAL"],
    ["PRODUCT_MANAGEMENT_PM07_TOPIC", productManagementCompatibilityFixtures[0]!.input.topic],
    ["PRODUCT_MANAGEMENT_PM07_APPROVED_REQUESTER_EMAIL", "requester@example.invalid"],
    ["PRODUCT_MANAGEMENT_PM07_SHAREPOINT_SITE_URL", "https://not-sharepoint.example/sites/controlled"],
  ] as const) {
    assert.throws(() => readProductManagementControlledAcceptanceConfiguration({ ...environment(), [key]: value }), ProductManagementControlledAcceptanceSafetyError, key);
  }
  assert.equal(readProductManagementControlledAcceptanceConfiguration(environment()).target.classification, "PRODUCTION_CONTROLLED_ACCEPTANCE");
  assert.equal(readProductManagementControlledAcceptanceConfiguration(environment()).rejectionIntent, PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT);
  assert.throws(() => readProductManagementControlledAcceptanceConfiguration({
    ...environment(), PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT: "UNKNOWN_REJECTION_INTENT",
  }), ProductManagementControlledAcceptanceSafetyError);
  const legacyConfiguration = {
    ...readProductManagementControlledAcceptanceConfiguration(environment()),
    rejectionIntent: "REJECT_AT_FIRST_TEAMS_APPROVAL",
  } as unknown as ProductManagementControlledAcceptanceConfiguration;
  assert.throws(() => new ProductManagementControlledAcceptanceRunner(
    legacyConfiguration, new FakeControlledAdapter(targetObservation, legacyConfiguration), () => timestamp,
  ), ProductManagementControlledAcceptanceSafetyError);
});

const allowedVstsArtifacts = {
  outcome: "KNOWN",
  controlledRequests: 1,
  sharePointItems: 1,
  sqlBackupRows: 1,
  flowRuns: 1,
  teamsApprovals: 1,
  portalApprovals: 0,
  vstsWorkItems: 1,
  vstsWorkItemOrigin: "LEGACY_WORKFLOW",
  vstsWorkItemState: "AWAITING_AUTHORIZED_REJECT",
  directVstsCreations: 0,
  vstsApprovedOrCompletedForBusinessExecution: false,
  accessChanges: 0,
  provisioningActions: 0,
  revocationActions: 0,
  unexpectedSideEffects: 0,
} as const;

test("one workflow-generated VSTS artifact is allowed and requires an authorized human reject", () => {
  assert.deepEqual(evaluateProductManagementControlledAcceptanceArtifacts(allowedVstsArtifacts), {
    status: "HUMAN_ACTION_REQUIRED",
    expectedVstsWorkItems: 1,
    workflowGeneratedVstsWorkItemAllowed: true,
    manualVstsRejectionRequired: true,
    accessChangingActionsAllowed: false,
  });
  assert.equal(evaluateProductManagementControlledAcceptanceArtifacts({
    ...allowedVstsArtifacts, vstsWorkItemState: "REJECTED",
  }).status, "VERIFIED_REJECTED");
});

test("excess or direct VSTS artifacts and ambiguous outcomes fail closed", () => {
  for (const observation of [
    { ...allowedVstsArtifacts, vstsWorkItems: 2 },
    { ...allowedVstsArtifacts, directVstsCreations: 1 },
    { ...allowedVstsArtifacts, outcome: "AMBIGUOUS" as const },
    { ...allowedVstsArtifacts, unexpectedSideEffects: 1 },
  ]) {
    assert.throws(() => evaluateProductManagementControlledAcceptanceArtifacts(observation), ProductManagementControlledAcceptanceSafetyError);
  }
});

test("access execution, provisioning, revocation, and double approval remain prohibited", () => {
  for (const observation of [
    { ...allowedVstsArtifacts, accessChanges: 1 },
    { ...allowedVstsArtifacts, provisioningActions: 1 },
    { ...allowedVstsArtifacts, revocationActions: 1 },
    { ...allowedVstsArtifacts, portalApprovals: 1 },
    { ...allowedVstsArtifacts, teamsApprovals: 2 },
    { ...allowedVstsArtifacts, vstsApprovedOrCompletedForBusinessExecution: true },
  ]) {
    assert.throws(() => evaluateProductManagementControlledAcceptanceArtifacts(observation), ProductManagementControlledAcceptanceSafetyError);
  }
});

test("PM-07 dry run is exact, marked, non-writing, and creates no Portal approval", () => {
  const dryRun = reviewedDryRun();
  assert.equal(dryRun.preview.validation.status, "PASS");
  assert.equal(dryRun.preview.mappedLegacyFields["AccountName(Product)"], PRODUCT_MANAGEMENT_PM07_MARKER);
  assert.match(dryRun.preview.mappedLegacyFields.Detail!, /PORTAL-TEST-PM07/);
  assert.equal(dryRun.targetClassification, "PRODUCTION_CONTROLLED_ACCEPTANCE");
  assert.equal(dryRun.writeAllowed, false);
  assert.equal(dryRun.portalApprovalCreated, false);
  assert.equal(dryRun.automaticRetryAllowed, false);
  assert.equal(dryRun.envelope.topic, PRODUCT_MANAGEMENT_PM07_TOPIC);
});

test("controlled runner performs dry run, target inspection, one submit, and read-back only", async () => {
  const configuration = readProductManagementControlledAcceptanceConfiguration(environment());
  const adapter = new FakeControlledAdapter(targetObservation, configuration);
  const runner = new ProductManagementControlledAcceptanceRunner(
    configuration, adapter, () => timestamp,
  );
  const result = await runner.execute(pm07Input, "pm07-controlled-correlation");
  assert.equal(result.state, "VERIFIED_PENDING_LEGACY_APPROVAL");
  assert.deepEqual(adapter.events, ["INSPECT_TARGET", "SUBMIT_ONCE", "VERIFY"]);
  assert.equal(result.attempts, 1);
  assert.equal(result.automaticRetries, 0);
  assert.equal(result.portalApprovalCreated, false);
  assert.equal(result.approvalBypassed, false);
  assert.equal(result.provisioningPerformed, false);
  assert.equal(result.rejectionPerformed, false);
  await assert.rejects(runner.execute(pm07Input, "pm07-second-attempt"), ProductManagementControlledAcceptanceSafetyError);
  assert.equal(adapter.events.filter((event) => event === "SUBMIT_ONCE").length, 1);
});

test("fingerprint drift and an existing marker stop before the Production write", async () => {
  const mismatchedEnvironment = environment();
  mismatchedEnvironment.PRODUCT_MANAGEMENT_PM07_EXPECTED_PAYLOAD_FINGERPRINT = `sha256:${"0".repeat(64)}`;
  const driftConfiguration = readProductManagementControlledAcceptanceConfiguration(mismatchedEnvironment);
  const driftAdapter = new FakeControlledAdapter(targetObservation, driftConfiguration);
  const driftRunner = new ProductManagementControlledAcceptanceRunner(
    driftConfiguration, driftAdapter, () => timestamp,
  );
  await assert.rejects(driftRunner.execute(pm07Input, "pm07-controlled-correlation"), /fingerprint differs/);
  assert.deepEqual(driftAdapter.events, []);

  const collisionConfiguration = readProductManagementControlledAcceptanceConfiguration(environment());
  const collisionAdapter = new FakeControlledAdapter({ ...targetObservation, existingMarkerMatches: 1 }, collisionConfiguration);
  const collisionRunner = new ProductManagementControlledAcceptanceRunner(
    collisionConfiguration, collisionAdapter, () => timestamp,
  );
  await assert.rejects(collisionRunner.execute(pm07Input, "pm07-controlled-correlation"), /marker pre-write verification failed/);
  assert.deepEqual(collisionAdapter.events, ["INSPECT_TARGET"]);
});

test("ambiguous submission outcome is terminal and never auto-retried or auto-reconciled", async () => {
  const configuration = readProductManagementControlledAcceptanceConfiguration(environment());
  const adapter = new FakeControlledAdapter(targetObservation, configuration);
  adapter.submitResult = { status: "UNKNOWN_OUTCOME", failure: { code: "UNKNOWN_OUTCOME", retryClassification: "UNKNOWN" } };
  const runner = new ProductManagementControlledAcceptanceRunner(
    configuration, adapter, () => timestamp,
  );
  const result = await runner.execute(pm07Input, "pm07-controlled-correlation");
  assert.equal(result.state, "UNKNOWN_OUTCOME");
  assert.equal(result.automaticRetries, 0);
  assert.deepEqual(adapter.events, ["INSPECT_TARGET", "SUBMIT_ONCE"]);
});

test("normal runtime cannot register the controlled Production adapter", () => {
  assert.throws(() => readProductManagementRuntimeSafety({
    PRODUCT_MANAGEMENT_ADAPTER_TARGET: "production_controlled_acceptance",
  }), ProductManagementRuntimeSafetyError);
});

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

test("real SharePoint adapter verifies target/schema/identity, posts once, and verifies the exact payload", async () => {
  const configuration = readProductManagementControlledAcceptanceConfiguration(environment());
  const envelope = reviewedDryRun().envelope;
  const fieldEntries = Object.keys(envelope.payload).map((title, index) => ({
    Title: title,
    InternalName: `Pm07Field${index}`,
    Hidden: false,
    ReadOnlyField: false,
  }));
  const internalByTitle = Object.fromEntries(fieldEntries.map((field) => [field.Title, field.InternalName]));
  let submittedBody: Record<string, unknown> | null = null;
  let postCalls = 0;
  const fetchImpl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/_api/web/currentuser")) return jsonResponse({ Email: approvedRequesterEmail, Title: "Approved PM07 Test User", PrincipalType: 1 });
    if (url.pathname.endsWith("/fields")) return jsonResponse({ value: fieldEntries });
    if (url.pathname.endsWith("/items(321)")) return jsonResponse({ Id: 321, ...(submittedBody ?? {}) });
    if (url.pathname.endsWith("/items") && init?.method === "POST") {
      postCalls += 1;
      submittedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
      assert.equal(String((init.headers as Record<string, string>).Authorization).includes("synthetic-secret-token"), true);
      return jsonResponse({ Id: 321 }, 201);
    }
    if (url.pathname.endsWith("/items")) return jsonResponse({ value: [] });
    return jsonResponse({ Title: "USR_PowerApp", BaseTemplate: 100, Hidden: false });
  };
  const adapter = new SharePointProductManagementControlledAcceptanceAdapter(
    configuration, async () => "synthetic-secret-token", fetchImpl,
  );
  const observed = await adapter.inspectTarget(envelope);
  assert.equal(observed.existingMarkerMatches, 0);
  const submitted = await adapter.submit(envelope);
  assert.deepEqual(submitted, { status: "ACCEPTED_BY_ADAPTER", downstreamReference: "321" });
  assert.equal(postCalls, 1);
  for (const [title, value] of Object.entries(envelope.payload)) assert.equal(submittedBody![internalByTitle[title]!], value);
  assert.deepEqual(await adapter.verify(envelope, "321"), { status: "VERIFIED", downstreamReference: "321" });
  await assert.rejects(adapter.submit(envelope), /only one POST attempt/);
  assert.equal(postCalls, 1);
});

test("real adapter converts an ambiguous POST transport failure into UNKNOWN_OUTCOME without retry", async () => {
  const configuration = readProductManagementControlledAcceptanceConfiguration(environment());
  const envelope = reviewedDryRun().envelope;
  const fieldEntries = Object.keys(envelope.payload).map((title, index) => ({ Title: title, InternalName: `Pm07Field${index}`, Hidden: false, ReadOnlyField: false }));
  let postCalls = 0;
  const fetchImpl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/_api/web/currentuser")) return jsonResponse({ Email: approvedRequesterEmail, Title: "Approved PM07 Test User", PrincipalType: 1 });
    if (url.pathname.endsWith("/fields")) return jsonResponse({ value: fieldEntries });
    if (url.pathname.endsWith("/items") && init?.method === "POST") {
      postCalls += 1;
      throw new Error("synthetic ambiguous transport failure");
    }
    if (url.pathname.endsWith("/items")) return jsonResponse({ value: [] });
    return jsonResponse({ Title: "USR_PowerApp", BaseTemplate: 100, Hidden: false });
  };
  const adapter = new SharePointProductManagementControlledAcceptanceAdapter(configuration, async () => "synthetic-token", fetchImpl);
  const result = await adapter.submit(envelope);
  assert.equal(result.status, "UNKNOWN_OUTCOME");
  assert.equal(postCalls, 1);
  await assert.rejects(adapter.submit(envelope), /only one POST attempt/);
  assert.equal(postCalls, 1);
});

test("real adapter independently rejects envelope drift before any target read", async () => {
  const configuration = readProductManagementControlledAcceptanceConfiguration(environment());
  let fetchCalls = 0;
  const adapter = new SharePointProductManagementControlledAcceptanceAdapter(
    configuration,
    async () => "synthetic-token",
    async () => { fetchCalls += 1; throw new Error("must not execute"); },
  );
  const drifted = { ...reviewedDryRun().envelope, idempotencyKey: "unreviewed-idempotency-key" } as ProductManagementControlledAcceptanceEnvelopeV1;
  await assert.rejects(adapter.inspectTarget(drifted), /unreviewed or drifted/);
  assert.equal(fetchCalls, 0);
});
