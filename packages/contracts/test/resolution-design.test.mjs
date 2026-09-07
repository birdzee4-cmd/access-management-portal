import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  resolutionStatuses, governanceStatuses, activationStatuses, resolutionAuditEventTypes,
  validateResolutionTransition, validateGovernanceTransition, validateActivationEligibility,
  detectSourceDrift, validateExpectedVersion, createNextVersionMetadata,
  validateResolutionReason, validateResolutionPayload, MAX_RESOLUTION_REASON_LENGTH,
} from "../dist/index.js";

const decision = { recordId: "SYNTHETIC-RECORD", decisionId: "SYNTHETIC-DECISION-3", version: 3 };
const source = { candidateType: "CATALOG", sourceScope: "SYNTHETIC-SOURCE",
  candidateFingerprint: "a".repeat(64), sourceSnapshotHash: "b".repeat(64), hashAlgorithm: "SHA256", normalizationVersion: "SYNTHETIC-V1" };
const approver = { identityType: "PORTAL_USER", identityId: "SYNTHETIC-ACTOR-A", portalContext: "SYNTHETIC-PORTAL" };
const secondApprover = { identityType: "ENTRA_USER", identityId: "SYNTHETIC-ACTOR-B", tenantContext: "SYNTHETIC-TENANT" };
const catalogPayload = { candidateType: "CATALOG", schemaVersion: 1,
  system: { kind: "SYSTEM", reference: "SYNTHETIC-SYSTEM" }, role: { kind: "ROLE", reference: "SYNTHETIC-ROLE" },
  application: { status: "NOT_APPLICABLE", reason: "Synthetic system has no application dimension." },
  permission: { status: "UNRESOLVED" }, context: { status: "UNRESOLVED" } };
const approvalPayload = { candidateType: "APPROVAL_RULE", schemaVersion: 1, catalogResolution: decision,
  approvers: [approver, secondApprover], decisionMode: { mode: "UNKNOWN", sequence: [] },
  scope: { role: "IN_SCOPE", department: "UNRESOLVED", source: "UNRESOLVED", context: "UNRESOLVED" } };
const eligible = () => ({ resolutionStatus: "RESOLVED", governanceStatus: "APPROVED", activationStatus: "INACTIVE",
  currentDecision: { ...decision }, approvedDecision: { ...decision }, sourceDrift: "UNCHANGED",
  policyChecks: "VERIFIED", identityChecks: "VERIFIED", blockers: [] });
const current = { recordId: decision.recordId, currentVersion: 3, revision: 7, latestDecisionId: decision.decisionId };
const token = { recordId: decision.recordId, expectedVersion: 7 };

test("resolution, governance, activation and execution are distinct vocabularies", () => {
  assert.ok(resolutionStatuses.includes("RESOLVED"));
  assert.ok(!resolutionStatuses.includes("APPROVED"));
  assert.ok(governanceStatuses.includes("APPROVED"));
  assert.ok(!governanceStatuses.includes("ACTIVE"));
  assert.ok(activationStatuses.includes("ACTIVE"));
  assert.ok(!activationStatuses.includes("PROVISIONED"));
  const types = readFileSync(new URL("../src/resolution-design.ts", import.meta.url), "utf8");
  const record = types.split("export interface ResolutionRecord {")[1].split("\n}")[0];
  assert.doesNotMatch(record, /provision/i);
});

for (const [from, to] of [["UNRESOLVED", "IN_REVIEW"], ["IN_REVIEW", "RESOLVED"], ["IN_REVIEW", "BLOCKED"],
  ["BLOCKED", "IN_REVIEW"], ["RESOLVED", "IN_REVIEW"], ["RESOLVED", "SUPERSEDED"]]) {
  test(`resolution transition ${from} to ${to} is structurally allowed`, () => {
    assert.deepEqual(validateResolutionTransition(from, to), { valid: true });
  });
}
test("invalid resolution transitions and unknown states fail closed", () => {
  for (const [from, to] of [["UNRESOLVED", "RESOLVED"], ["SUPERSEDED", "IN_REVIEW"], ["RESOLVED", "RESOLVED"],
    ["constructor", "RESOLVED"], ["UNRESOLVED", "ACTIVE"], ["UNKNOWN", "IN_REVIEW"]]) {
    assert.equal(validateResolutionTransition(from, to).valid, false);
  }
});
for (const [from, to] of [["NOT_SUBMITTED", "PENDING_REVIEW"], ["PENDING_REVIEW", "APPROVED"], ["PENDING_REVIEW", "REJECTED"]]) {
  test(`governance ${from} to ${to} requires a separate conceptual transition`, () => {
    assert.equal(validateGovernanceTransition(from, to).valid, true);
  });
}
test("governance approval cannot skip review or change terminal version history", () => {
  for (const [from, to] of [["NOT_SUBMITTED", "APPROVED"], ["APPROVED", "PENDING_REVIEW"], ["REJECTED", "PENDING_REVIEW"], ["UNKNOWN", "APPROVED"], ["PENDING_REVIEW", "ACTIVE"]]) {
    assert.equal(validateGovernanceTransition(from, to).valid, false);
  }
});
for (const [field, value] of [["resolutionStatus", "UNRESOLVED"], ["governanceStatus", "NOT_SUBMITTED"],
  ["sourceDrift", "SOURCE_CHANGED"], ["sourceDrift", "SOURCE_MISSING"], ["sourceDrift", "SOURCE_COLLISION"], ["sourceDrift", "UNKNOWN"],
  ["policyChecks", "POLICY_REQUIRED"], ["identityChecks", "INELIGIBLE"], ["identityChecks", "UNRESOLVED"]]) {
  test(`activation is not eligible for ${field}=${value}`, () => {
    assert.equal(validateActivationEligibility({ ...eligible(), [field]: value }).status, "NOT_ELIGIBLE");
  });
}
test("blockers and missing blocker evidence prevent activation eligibility", () => {
  for (const blockers of [["SYNTHETIC_COLLISION"], undefined]) assert.equal(validateActivationEligibility({ ...eligible(), blockers }).status, "NOT_ELIGIBLE");
});
test("fully valid facts only yield explicit activation eligibility and never mutate state", () => {
  const input = eligible();
  const before = structuredClone(input);
  assert.deepEqual(validateActivationEligibility(input), { status: "ELIGIBLE_FOR_EXPLICIT_ACTIVATION", blockers: [] });
  assert.deepEqual(input, before);
  assert.equal(input.activationStatus, "INACTIVE");
  assert.equal(validateActivationEligibility({ ...input, activationStatus: "ACTIVE" }).status, "NOT_ELIGIBLE");
});
test("governance must approve the exact current decision and version", () => {
  for (const approvedDecision of [null, { ...decision, version: 2 }, { ...decision, recordId: "OTHER-RECORD" }, { ...decision, decisionId: "OTHER-DECISION" }]) {
    assert.equal(validateActivationEligibility({ ...eligible(), approvedDecision }).status, "NOT_ELIGIBLE");
  }
});
test("unknown runtime states cannot be treated as activation eligibility", () => {
  for (const field of ["resolutionStatus", "governanceStatus", "activationStatus", "sourceDrift", "policyChecks", "identityChecks"]) {
    assert.equal(validateActivationEligibility({ ...eligible(), [field]: "INVALID" }).status, "NOT_ELIGIBLE");
  }
});
test("matching source fingerprint, hash, scope and normalization version are unchanged", () => {
  assert.equal(detectSourceDrift(source, { state: "FOUND", matches: [{ ...source }] }), "UNCHANGED");
});
test("changed hash, fingerprint, type or source scope is material drift", () => {
  for (const change of [{ sourceSnapshotHash: "c".repeat(64) }, { candidateFingerprint: "c".repeat(64) },
    { candidateType: "APPROVAL_RULE" }, { sourceScope: "SYNTHETIC-OTHER" }]) {
    assert.equal(detectSourceDrift(source, { state: "FOUND", matches: [{ ...source, ...change }] }), "SOURCE_CHANGED");
  }
});
test("confirmed absence is missing but absence from bounded samples remains unknown", () => {
  assert.equal(detectSourceDrift(source, { state: "MISSING", authoritativeLookup: true }), "SOURCE_MISSING");
  assert.equal(detectSourceDrift(source, { state: "MISSING", authoritativeLookup: false }), "UNKNOWN");
  assert.equal(detectSourceDrift(source, { state: "FOUND", matches: [] }), "UNKNOWN");
});
test("multiple source matches remain collisions even when their hashes are identical", () => {
  assert.equal(detectSourceDrift(source, { state: "FOUND", matches: [source, source] }), "SOURCE_COLLISION");
});
test("missing/malformed hashes or changed normalization versions cannot imply unchanged", () => {
  for (const current of [{ state: "UNKNOWN" }, { state: "FOUND", matches: [{ ...source, sourceSnapshotHash: "" }] },
    { state: "FOUND", matches: [{ ...source, normalizationVersion: "SYNTHETIC-V2" }] }, { state: "FOUND", matches: [{ ...source, hashAlgorithm: "OTHER" }] }]) {
    assert.equal(detectSourceDrift(source, current), "UNKNOWN");
  }
});
test("expected aggregate revision succeeds even when decision version differs", () => {
  assert.deepEqual(validateExpectedVersion(current, token), { valid: true });
});
test("concurrent stale edit conflicts and cannot create another next version", () => {
  const next = createNextVersionMetadata(current, token);
  assert.equal(next.valid, true);
  const updated = { ...current, currentVersion: next.metadata.version, revision: next.metadata.revision, latestDecisionId: "SYNTHETIC-DECISION-4" };
  assert.deepEqual(validateExpectedVersion(updated, token), { valid: false, code: "VERSION_CONFLICT" });
  assert.deepEqual(createNextVersionMetadata(updated, token), { valid: false, code: "VERSION_CONFLICT" });
});
test("record mismatch and invalid version tokens fail closed", () => {
  assert.equal(validateExpectedVersion(current, { ...token, recordId: "OTHER" }).code, "VERSION_CONFLICT");
  for (const expectedVersion of [0, -1, 1.5, NaN, Infinity, "7"]) {
    assert.equal(validateExpectedVersion(current, { ...token, expectedVersion }).code, "INVALID_CONCURRENCY_TOKEN");
  }
});
test("v1 to v2 metadata increments monotonically and preserves previous history", () => {
  const history = [{ id: "SYNTHETIC-DECISION-1", version: 1, reason: "Original synthetic decision." }];
  const original = structuredClone(history);
  const next = createNextVersionMetadata({ ...current, currentVersion: 1, latestDecisionId: history[0].id }, token);
  assert.equal(next.valid, true);
  assert.equal(next.metadata.version, 2);
  assert.equal(next.metadata.revision, 8);
  assert.equal(next.metadata.previousDecisionId, history[0].id);
  assert.equal(next.metadata.governanceStatus, "NOT_SUBMITTED");
  assert.equal(next.metadata.activationStatus, "INACTIVE");
  assert.deepEqual(history, original);
});
test("first decision metadata has no fabricated previous decision", () => {
  const result = createNextVersionMetadata({ ...current, currentVersion: 0, latestDecisionId: null }, token);
  assert.equal(result.valid, true);
  assert.equal(result.metadata.version, 1);
  assert.equal(result.metadata.previousDecisionId, null);
});
test("rollback creates v4 referencing v1 and v3 without reverting version counters", () => {
  const target = { ...decision, decisionId: "SYNTHETIC-DECISION-1", version: 1 };
  const result = createNextVersionMetadata(current, token, target);
  assert.equal(result.valid, true);
  assert.equal(result.metadata.version, 4);
  assert.equal(result.metadata.previousDecisionId, current.latestDecisionId);
  assert.deepEqual(result.metadata.rollbackOf, target);
  assert.notEqual(result.metadata.rollbackOf, target);
  assert.equal(current.currentVersion, 3);
});
test("invalid, future or cross-record rollback references are rejected", () => {
  for (const target of [{ ...decision, recordId: "OTHER" }, { ...decision, version: 4 }, decision,
    { ...decision, version: 1, decisionId: "" }]) assert.equal(createNextVersionMetadata(current, token, target).valid, false);
});
test("invalid history and numeric overflow cannot wrap monotonic versions", () => {
  for (const change of [{ currentVersion: -1 }, { currentVersion: 1.5 }, { currentVersion: 8 },
    { currentVersion: Number.MAX_SAFE_INTEGER }, { currentVersion: 0 }, { latestDecisionId: null }]) {
    assert.equal(createNextVersionMetadata({ ...current, ...change }, token).valid, false);
  }
  assert.equal(createNextVersionMetadata({ ...current, revision: Number.MAX_SAFE_INTEGER }, { ...token, expectedVersion: Number.MAX_SAFE_INTEGER }).valid, false);
});
test("decision reasons are bounded plain text and required", () => {
  assert.equal(validateResolutionReason("Synthetic review rationale.\nSecond line.").valid, true);
  assert.equal(validateResolutionReason("x".repeat(MAX_RESOLUTION_REASON_LENGTH)).valid, true);
  for (const reason of [null, "", "   ", "<script>demo</script>", "unsafe\u0000text", "x".repeat(MAX_RESOLUTION_REASON_LENGTH + 1)]) {
    assert.equal(validateResolutionReason(reason).valid, false);
  }
});
test("typed catalog and approval draft payloads allow explicit unresolved states without resolving them", () => {
  assert.equal(validateResolutionPayload(catalogPayload).valid, true);
  assert.equal(validateResolutionPayload(approvalPayload).valid, true);
  assert.equal(approvalPayload.decisionMode.mode, "UNKNOWN");
  assert.equal(catalogPayload.permission.status, "UNRESOLVED");
});
test("catalog payload rejects wrong reference kinds, arbitrary keys and unreasoned non-applicability", () => {
  for (const payload of [{ ...catalogPayload, extra: {} }, { ...catalogPayload, system: { kind: "ROLE", reference: "SYNTHETIC" } },
    { ...catalogPayload, context: { status: "NOT_APPLICABLE", reason: "" } }, { candidateType: "UNRECOGNIZED" }]) {
    assert.equal(validateResolutionPayload(payload).valid, false);
  }
});
test("approver identity requires an issuer-scoped reference and rejects display strings or extra person fields", () => {
  for (const identity of ["Synthetic Manager", { identityType: "ENTRA_USER", identityId: "SYNTHETIC" },
    { ...approver, displayName: "Synthetic Person" }, { ...approver, manager: "Synthetic Manager" }]) {
    assert.equal(validateResolutionPayload({ ...approvalPayload, approvers: [identity] }).valid, false);
  }
  assert.equal(validateResolutionPayload({ ...approvalPayload, approvers: [approver, { ...approver }] }).valid, false);
});
test("synthetic sequence is an explicit unique permutation of scoped identity references", () => {
  const payload = { ...approvalPayload, decisionMode: { mode: "SEQUENTIAL", sequence: [secondApprover, approver] } };
  assert.equal(validateResolutionPayload(payload).valid, true);
  for (const sequence of [[], [approver], [approver, approver], [approver, { ...secondApprover, tenantContext: "OTHER" }]]) {
    assert.equal(validateResolutionPayload({ ...payload, decisionMode: { mode: "SEQUENTIAL", sequence } }).valid, false);
  }
  assert.equal(validateResolutionPayload({ ...payload, decisionMode: { mode: "ANY", sequence: [approver] } }).valid, false);
});
test("audit vocabulary defines history but importing helpers emits no event or network operation", () => {
  for (const event of ["RESOLUTION_CREATED", "DECISION_DRAFTED", "DECISION_REVIEWED", "DECISION_REJECTED", "DECISION_APPROVED",
    "RESOLUTION_ACTIVATED", "RESOLUTION_DEACTIVATED", "RESOLUTION_SUPERSEDED"]) assert.ok(resolutionAuditEventTypes.includes(event));
  const text = readFileSync(new URL("../src/resolution-design.ts", import.meta.url), "utf8");
  assert.doesNotMatch(text, /fetch\(|console\.|process\.|Date\.now|Math\.random|Prisma|executeSelect|\.save\(|\.emit\(/);
  assert.doesNotMatch(text, /readonly (manager|displayName|email|password|accessToken|clientSecret)\s*:/);
});
test("07P remains synthetic memory-only with no new save or write dependency", () => {
  const page = readFileSync(new URL("../../../apps/web/src/pages/ResolutionWorkspacePage.tsx", import.meta.url), "utf8");
  const fixtures = readFileSync(new URL("../../../apps/web/src/resolution/fixtures.ts", import.meta.url), "utf8");
  assert.match(page, /Preview only — changes are not saved/);
  assert.match(page, /useState/);
  assert.doesNotMatch(page, />\s*(Save|Submit|Publish|Activate|Provision)\s*</);
  assert.doesNotMatch(page, /fetch\(|\/api\/|localStorage|sessionStorage|indexedDB|resolution-design/);
  assert.equal((fixtures.match(/dataSource: "SYNTHETIC"/g) ?? []).length, 5);
});
