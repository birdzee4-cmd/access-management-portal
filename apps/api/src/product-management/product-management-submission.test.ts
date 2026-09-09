import assert from "node:assert/strict";
import test from "node:test";
import { productManagementCompatibilityFixtures } from "./product-management-compatibility.fixtures.js";
import {
  ProductManagementRuntimeSafetyError,
  readProductManagementRuntimeSafety,
  serializeProductManagementCompatibilityPayload,
} from "./product-management-compatibility.js";
import { productManagementTopics } from "./product-management-model.js";
import {
  InMemoryProductManagementIdempotencyStore,
  InMemoryProductManagementSubmissionAuditSink,
  PRODUCT_MANAGEMENT_RETRY_POLICY,
  PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION,
  ProductManagementIdempotencyConflictError,
  ProductManagementSubmissionService,
  SyntheticProductManagementSubmissionAdapter,
  canonicalizeProductManagementPayload,
  classifyProductManagementFailure,
  createProductManagementSubmissionAdapter,
  createProductManagementSubmissionEnvelope,
  fingerprintProductManagementPayload,
  type ProductManagementSubmissionAdapter,
  type ProductManagementSubmissionEnvelopeV1,
  type SyntheticProductManagementAdapterBehavior,
} from "./product-management-submission.js";

const timestamp = "2026-09-09T00:00:00.000Z";
const target = { classification: "SYNTHETIC_NON_PRODUCTION", name: "PM06_ACCEPTANCE" } as const;

function harness(
  behaviors: readonly SyntheticProductManagementAdapterBehavior[] = ["ACCEPT"],
  verification: "VERIFIED" | "FAILED" | "UNAVAILABLE" = "VERIFIED",
) {
  const adapter = new SyntheticProductManagementSubmissionAdapter(behaviors, verification);
  const audit = new InMemoryProductManagementSubmissionAuditSink();
  const service = new ProductManagementSubmissionService(adapter, new InMemoryProductManagementIdempotencyStore(), audit, () => timestamp);
  return { adapter, audit, service };
}

function executionInput(index: number, suffix = "base") {
  return {
    compatibilityInput: productManagementCompatibilityFixtures[index]!.input,
    correlationId: `synthetic-correlation-${index}-${suffix}`,
    idempotencyKey: `synthetic-idempotency-${index}-${suffix}`,
  } as const;
}

test("all 13 Topics pass serializer to envelope, synthetic adapter, audit, and verification acceptance", async () => {
  assert.deepEqual(productManagementCompatibilityFixtures.map((fixture) => fixture.input.topic), [...productManagementTopics]);
  let networkCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { networkCalls += 1; throw new Error("network forbidden"); };
  try {
    for (const [index, fixture] of productManagementCompatibilityFixtures.entries()) {
      const { adapter, audit, service } = harness();
      const result = await service.execute(executionInput(index));
      assert.equal(result.state, "VERIFIED", fixture.name);
      assert.equal(result.envelope.schemaVersion, PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION, fixture.name);
      assert.equal(result.envelope.target.classification, "SYNTHETIC_NON_PRODUCTION", fixture.name);
      assert.equal(result.envelope.topic, fixture.input.topic, fixture.name);
      assert.deepEqual(result.envelope.payload, serializeProductManagementCompatibilityPayload(fixture.input), fixture.name);
      assert.equal(result.envelope.payloadFingerprint, fingerprintProductManagementPayload(result.envelope.payload), fixture.name);
      assert.deepEqual(result.transitions, ["VALIDATED", "SERIALIZED", "READY_FOR_ADAPTER", "ATTEMPTED", "ACCEPTED_BY_ADAPTER", "VERIFIED"], fixture.name);
      assert.deepEqual(audit.events.map((event) => event.eventType), [
        "PRODUCT_MANAGEMENT_SUBMISSION_PREPARED",
        "PRODUCT_MANAGEMENT_SUBMISSION_ATTEMPTED",
        "PRODUCT_MANAGEMENT_SUBMISSION_ACCEPTED",
        "PRODUCT_MANAGEMENT_SUBMISSION_VERIFIED",
      ], fixture.name);
      assert.equal(adapter.acceptedActions.length, 1, fixture.name);
      assert.equal(result.portalApprovalCreated, false, fixture.name);
      assert.equal(result.provisioningPerformed, false, fixture.name);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(networkCalls, 0);
});

test("envelope identity hashes a documented canonical payload independent of object key order", () => {
  const fixture = productManagementCompatibilityFixtures[0]!;
  const first = createProductManagementSubmissionEnvelope({ compatibilityInput: fixture.input,
    correlationId: "synthetic-correlation", idempotencyKey: "synthetic-key", createdAt: timestamp, target });
  const reversedPayload = Object.fromEntries(Object.entries(first.payload).reverse()) as typeof first.payload;
  assert.equal(canonicalizeProductManagementPayload(first.payload), canonicalizeProductManagementPayload(reversedPayload));
  assert.equal(fingerprintProductManagementPayload(first.payload), fingerprintProductManagementPayload(reversedPayload));
  assert.deepEqual(Object.keys(first).sort(), ["correlationId", "createdAt", "idempotencyKey", "payload", "payloadFingerprint", "schemaVersion", "target", "topic"].sort());
  assert.equal(JSON.stringify(first).includes("accessToken"), false);
  assert.equal(JSON.stringify(first).includes("credentials"), false);
  assert.equal(JSON.stringify(first).includes("claims"), false);
});

test("same idempotency key and payload reuses the result without a duplicate accepted action", async () => {
  const { adapter, audit, service } = harness();
  const input = executionInput(0, "replay");
  const first = await service.execute(input);
  const second = await service.execute({ ...input, correlationId: "synthetic-replay-correlation" });
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(second.downstreamReference, first.downstreamReference);
  assert.equal(adapter.acceptedActions.length, 1);
  assert.equal(audit.events.length, 4);
});

test("same idempotency key with a different canonical payload fails closed", async () => {
  const { adapter, audit, service } = harness();
  const first = executionInput(0, "conflict");
  await service.execute(first);
  const changed = structuredClone(first) as any;
  changed.compatibilityInput.fields.companyName = "Synthetic Company PM06 Changed";
  await assert.rejects(service.execute(changed), ProductManagementIdempotencyConflictError);
  assert.equal(adapter.acceptedActions.length, 1);
  assert.equal(service.metrics.idempotencyConflicts, 1);
  assert.equal(audit.events.at(-1)?.resultClassification, "IDEMPOTENCY_CONFLICT");
});

test("duplicate concurrent attempts share one in-flight result and cannot accept twice", async () => {
  const { adapter, audit, service } = harness();
  const input = executionInput(1, "concurrent");
  const [left, right] = await Promise.all([service.execute(input), service.execute(input)]);
  assert.equal([left.replayed, right.replayed].filter(Boolean).length, 1);
  assert.equal(left.downstreamReference, right.downstreamReference);
  assert.equal(adapter.acceptedActions.length, 1);
  assert.equal(adapter.attempts.length, 1);
  assert.equal(audit.events.length, 4);
});

for (const scenario of ["TIMEOUT", "DOWNSTREAM_429", "DOWNSTREAM_5XX", "TEMPORARY_NETWORK_FAILURE", "ADAPTER_UNAVAILABLE"] as const) {
  test(`${scenario} is retryable and succeeds within the bounded policy`, async () => {
    const { adapter, audit, service } = harness([scenario, "ACCEPT"]);
    const result = await service.execute(executionInput(2, scenario));
    assert.equal(result.state, "VERIFIED");
    assert.equal(result.attempts, 2);
    assert.equal(adapter.acceptedActions.length, 1);
    assert.equal(service.metrics.retried, 1);
    assert.equal(audit.events.filter((event) => event.eventType === "PRODUCT_MANAGEMENT_SUBMISSION_ATTEMPTED").length, 2);
  });
}

test("retry policy is bounded, deterministic, and has no internal waiting", async () => {
  assert.deepEqual(PRODUCT_MANAGEMENT_RETRY_POLICY, {
    maximumAttempts: 3,
    backoffMilliseconds: [0, 250, 1000],
    waitingMode: "CALLER_SCHEDULED_NO_INTERNAL_SLEEP",
  });
  const { adapter, service } = harness(["TIMEOUT"]);
  const result = await service.execute(executionInput(3, "exhausted"));
  assert.equal(result.state, "FAILED");
  assert.equal(result.attempts, 3);
  assert.equal(result.failure?.code, "RETRY_EXHAUSTED");
  assert.equal(adapter.acceptedActions.length, 0);
});

for (const scenario of ["DOWNSTREAM_4XX", "AUTHENTICATION_FAILURE", "AUTHORIZATION_FAILURE", "PAYLOAD_CONTRACT_MISMATCH", "BUSINESS_REJECTION"] as const) {
  test(`${scenario} is non-retryable`, async () => {
    const { adapter, service } = harness([scenario]);
    const result = await service.execute(executionInput(4, scenario));
    assert.equal(result.state, "FAILED");
    assert.equal(result.attempts, 1);
    assert.equal(result.failure?.retryClassification, "NON_RETRYABLE");
    assert.equal(adapter.acceptedActions.length, 0);
  });
}

test("unknown outcome stops safely, is not retried, and replays the terminal result", async () => {
  const { adapter, service } = harness(["UNKNOWN_AFTER_ACCEPTANCE", "ACCEPT"]);
  const input = executionInput(5, "unknown");
  const first = await service.execute(input);
  const replay = await service.execute(input);
  assert.equal(first.state, "FAILED");
  assert.equal(first.failure?.code, "UNKNOWN_OUTCOME");
  assert.equal(first.attempts, 1);
  assert.equal(replay.replayed, true);
  assert.equal(adapter.attempts.length, 1);
  assert.equal(adapter.acceptedActions.length, 1);
  assert.equal(service.metrics.unknownOutcomes, 1);
});

test("adapter acceptance remains distinct from successful verification", async () => {
  for (const verification of ["FAILED", "UNAVAILABLE"] as const) {
    const { adapter, audit, service } = harness(["ACCEPT"], verification);
    const result = await service.execute(executionInput(6, verification));
    assert.equal(result.state, "ACCEPTED_BY_ADAPTER");
    assert.equal(result.verification?.status, verification);
    assert.equal(result.transitions.includes("VERIFIED"), false);
    assert.equal(result.transitions.at(-1), "FAILED");
    assert.equal(adapter.acceptedActions.length, 1);
    assert.equal(audit.events.at(-1)?.eventType, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED");
  }
});

test("audit and metrics contain operational metadata but no payload, emails, credentials, claims, or approval event", async () => {
  const { audit, service } = harness(["DOWNSTREAM_429", "ACCEPT"]);
  await service.execute(executionInput(7, "audit"));
  const serialized = JSON.stringify({ events: audit.events, metrics: service.metrics });
  for (const forbidden of ["requester.pm05@example.invalid", "routing.pm05@example.invalid", "Synthetic Add-On", "accessToken", "credentials", "claims", "APPROVAL_CREATED", "PROVISION"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(service.metrics.prepared, 1);
  assert.equal(service.metrics.attempted, 2);
  assert.equal(service.metrics.accepted, 1);
  assert.equal(service.metrics.retried, 1);
});

test("Production, real, unknown, and missing adapter targets are rejected and runtime submission stays disabled", () => {
  for (const invalid of [undefined, {}, { classification: "PRODUCTION", name: "legacy" }, { classification: "REAL", name: "legacy" }, { classification: "SYNTHETIC_NON_PRODUCTION" }]) {
    assert.throws(() => createProductManagementSubmissionAdapter(invalid), ProductManagementRuntimeSafetyError);
  }
  assert.equal(createProductManagementSubmissionAdapter(target).target.classification, "SYNTHETIC_NON_PRODUCTION");
  assert.deepEqual(readProductManagementRuntimeSafety({}), { dataSource: "MOCK", submissionEnabled: false, adapterEnabled: false });
  for (const value of ["synthetic_non_production", "production", "real", "unknown"]) {
    assert.throws(() => readProductManagementRuntimeSafety({ PRODUCT_MANAGEMENT_ADAPTER_TARGET: value }), ProductManagementRuntimeSafetyError);
  }
});

test("service construction rejects an adapter that claims network capability", () => {
  const unsafe = {
    target,
    capabilities: { submit: true, verify: true, network: true },
    submit: async (_envelope: ProductManagementSubmissionEnvelopeV1) => ({ status: "FAILED", failure: { code: "ADAPTER_UNAVAILABLE", retryClassification: "RETRYABLE" } } as const),
    verify: async () => ({ status: "UNAVAILABLE", failure: { code: "VERIFICATION_UNAVAILABLE", retryClassification: "NON_RETRYABLE" } } as const),
  } as unknown as ProductManagementSubmissionAdapter;
  assert.throws(() => new ProductManagementSubmissionService(unsafe, new InMemoryProductManagementIdempotencyStore(), new InMemoryProductManagementSubmissionAuditSink(), () => timestamp), ProductManagementRuntimeSafetyError);
});

test("unexpected adapter and verifier exceptions become terminal safe outcomes", async () => {
  const throwingSubmit: ProductManagementSubmissionAdapter = {
    target,
    capabilities: { submit: true, verify: true, network: false },
    submit: async () => { throw new Error("synthetic transport ambiguity"); },
    verify: async () => { throw new Error("unused"); },
  };
  const submitService = new ProductManagementSubmissionService(throwingSubmit, new InMemoryProductManagementIdempotencyStore(), new InMemoryProductManagementSubmissionAuditSink(), () => timestamp);
  const submitResult = await submitService.execute(executionInput(8, "throw-submit"));
  assert.equal(submitResult.state, "FAILED");
  assert.equal(submitResult.failure?.code, "UNKNOWN_OUTCOME");
  assert.equal(submitResult.attempts, 1);

  const throwingVerify: ProductManagementSubmissionAdapter = {
    target,
    capabilities: { submit: true, verify: true, network: false },
    submit: async () => ({ status: "ACCEPTED_BY_ADAPTER", downstreamReference: "SYNTHETIC-THROW-VERIFY" }),
    verify: async () => { throw new Error("synthetic verification unavailable"); },
  };
  const verifyService = new ProductManagementSubmissionService(throwingVerify, new InMemoryProductManagementIdempotencyStore(), new InMemoryProductManagementSubmissionAuditSink(), () => timestamp);
  const verifyResult = await verifyService.execute(executionInput(9, "throw-verify"));
  assert.equal(verifyResult.state, "ACCEPTED_BY_ADAPTER");
  assert.equal(verifyResult.failure?.code, "VERIFICATION_UNAVAILABLE");
});

test("failure classification explicitly separates retryable, non-retryable, and ambiguous outcomes", () => {
  assert.equal(classifyProductManagementFailure("TIMEOUT"), "RETRYABLE");
  assert.equal(classifyProductManagementFailure("DOWNSTREAM_429"), "RETRYABLE");
  assert.equal(classifyProductManagementFailure("DOWNSTREAM_5XX"), "RETRYABLE");
  assert.equal(classifyProductManagementFailure("DOWNSTREAM_4XX"), "NON_RETRYABLE");
  assert.equal(classifyProductManagementFailure("VALIDATION_ERROR"), "NON_RETRYABLE");
  assert.equal(classifyProductManagementFailure("AUTHORIZATION_FAILURE"), "NON_RETRYABLE");
  assert.equal(classifyProductManagementFailure("UNSUPPORTED_TOPIC"), "NON_RETRYABLE");
  assert.equal(classifyProductManagementFailure("IDEMPOTENCY_CONFLICT"), "NON_RETRYABLE");
  assert.equal(classifyProductManagementFailure("UNKNOWN_OUTCOME"), "UNKNOWN");
});
