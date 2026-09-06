import assert from "node:assert/strict";
import test from "node:test";
import { resolutionCandidates } from "./fixtures.js";
import { catalogFields, catalogOptions, scopeFields, createResolutionDraft, updateResolutionDraft, validateResolutionDraft,
  type ResolutionDraft, type SyntheticResolutionCandidate } from "./model.js";

const candidate = resolutionCandidates[0]!;
export function completeDraft(c: SyntheticResolutionCandidate): ResolutionDraft {
  let draft = createResolutionDraft(c.candidateId);
  for (const field of catalogFields) draft = updateResolutionDraft(c, draft, { type: "catalog", field, value: catalogOptions[field][0]! });
  draft = updateResolutionDraft(c, draft, { type: "authority", value: "YES" });
  draft = updateResolutionDraft(c, draft, { type: "identity", value: "PORTAL_USER" });
  draft = updateResolutionDraft(c, draft, { type: "mode", value: "ALL" });
  for (const field of scopeFields) draft = updateResolutionDraft(c, draft, { type: "scope", field, value: field === "Role" ? "IN_SCOPE" : "NOT_IN_SCOPE" });
  return draft;
}

test("resolution defaults are unresolved, unreviewed and not ready", () => {
  const draft = createResolutionDraft(candidate.candidateId);
  assert.ok(Object.values(draft.catalog).every((value) => value === "UNRESOLVED"));
  assert.equal(draft.approval.approvalMode, "UNKNOWN");
  assert.equal(draft.approval.sequenceResolution, "UNRESOLVED");
  assert.equal(draft.reviewStatus, "UNREVIEWED");
  assert.equal(validateResolutionDraft(candidate, draft).readiness, "NOT_READY");
});
for (const [code, label] of [["CATALOG_SYSTEM", "System"], ["CATALOG_APPLICATION", "Application"], ["CATALOG_PERMISSION", "Permission"], ["AUTHORITY", "Authority"], ["MODE", "Approval mode"]]) {
  test(label + " unresolved is an explicit blocker", () => {
    assert.ok(validateResolutionDraft(candidate, createResolutionDraft(candidate.candidateId)).blockers.some((b) => b.code === code));
  });
}
test("complete synthetic decisions require explicit validation before resolved-for-preview", () => {
  const draft = completeDraft(candidate);
  assert.equal(validateResolutionDraft(candidate, draft).readiness, "READY_FOR_REVIEW");
  const validated = updateResolutionDraft(candidate, draft, { type: "validate" });
  assert.equal(validated.reviewStatus, "RESOLVED_FOR_PREVIEW");
  assert.equal(validateResolutionDraft(candidate, validated).readiness, "RESOLVED_FOR_PREVIEW");
  const edited = updateResolutionDraft(candidate, validated, { type: "catalog", field: "system", value: "UNRESOLVED" });
  assert.equal(edited.reviewStatus, "IN_REVIEW");
  assert.equal(validateResolutionDraft(candidate, edited).readiness, "NOT_READY");
});
test("invalid draft validation marks BLOCKED without fixing decisions", () => {
  const original = createResolutionDraft(candidate.candidateId);
  const next = updateResolutionDraft(candidate, original, { type: "validate" });
  assert.equal(next.reviewStatus, "BLOCKED");
  assert.deepEqual(next.catalog, original.catalog);
  assert.deepEqual(next.approval, original.approval);
});
test("SEQUENTIAL requires an explicitly chosen complete unique synthetic permutation", () => {
  const c = resolutionCandidates[2]!;
  let draft = updateResolutionDraft(c, completeDraft(c), { type: "mode", value: "SEQUENTIAL" });
  assert.ok(validateResolutionDraft(c, draft).blockers.some((b) => b.code === "SEQUENCE"));
  assert.deepEqual(draft.approval.sequence, []);
  draft = updateResolutionDraft(c, draft, { type: "sequence", position: 0, value: c.approvers[1]!.code });
  assert.ok(validateResolutionDraft(c, draft).blockers.some((b) => b.code === "SEQUENCE"));
  draft = updateResolutionDraft(c, draft, { type: "sequence", position: 1, value: c.approvers[1]!.code });
  assert.ok(validateResolutionDraft(c, draft).blockers.some((b) => b.code === "SEQUENCE"));
  draft = updateResolutionDraft(c, draft, { type: "sequence", position: 1, value: c.approvers[0]!.code });
  assert.equal(validateResolutionDraft(c, draft).readiness, "READY_FOR_REVIEW");
  draft = updateResolutionDraft(c, draft, { type: "mode", value: "ANY" });
  assert.deepEqual(draft.approval.sequence, []);
  assert.equal(draft.approval.sequenceResolution, "UNRESOLVED");
});
test("unknown synthetic sequence codes and out-of-range positions cannot establish readiness", () => {
  let draft = updateResolutionDraft(candidate, completeDraft(candidate), { type: "mode", value: "SEQUENTIAL" });
  assert.deepEqual(updateResolutionDraft(candidate, draft, { type: "sequence", position: -1, value: "UNKNOWN" }), draft);
  draft = updateResolutionDraft(candidate, draft, { type: "sequence", position: 0, value: "UNKNOWN" });
  assert.ok(validateResolutionDraft(candidate, draft).blockers.some((b) => b.code === "SEQUENCE"));
});
for (const [index, code] of [[3, "CATALOG_COLLISION"], [4, "CATALOG_LINK"]] as const) {
  test(code + " remains blocked even after all draft selections and validation", () => {
    const c = resolutionCandidates[index]!;
    const draft = updateResolutionDraft(c, completeDraft(c), { type: "validate" });
    assert.equal(draft.reviewStatus, "BLOCKED");
    assert.ok(validateResolutionDraft(c, draft).blockers.some((b) => b.code === code));
  });
}
test("NO authority and UNKNOWN identity are explicit choices but remain blockers", () => {
  let draft = updateResolutionDraft(candidate, completeDraft(candidate), { type: "authority", value: "NO" });
  draft = updateResolutionDraft(candidate, draft, { type: "identity", value: "UNKNOWN" });
  const codes = validateResolutionDraft(candidate, draft).blockers.map((b) => b.code);
  assert.ok(codes.includes("AUTHORITY") && codes.includes("IDENTITY"));
});
test("scope requires explicit dimension decisions and cannot be empty", () => {
  let draft = completeDraft(candidate);
  draft = updateResolutionDraft(candidate, draft, { type: "scope", field: "Role", value: "NOT_IN_SCOPE" });
  assert.ok(validateResolutionDraft(candidate, draft).blockers.some((b) => b.code === "EMPTY_SCOPE"));
  draft = updateResolutionDraft(candidate, draft, { type: "scope", field: "Source", value: "UNRESOLVED" });
  assert.ok(validateResolutionDraft(candidate, draft).blockers.some((b) => b.code === "SCOPE_SOURCE"));
});
test("reset creates a fresh initial draft and does not mutate fixtures or prior state", () => {
  const before = JSON.stringify(resolutionCandidates);
  const draft = completeDraft(candidate);
  assert.deepEqual(updateResolutionDraft(candidate, draft, { type: "reset" }), createResolutionDraft(candidate.candidateId));
  assert.equal(draft.catalog.system, "SYS-DEMO");
  assert.equal(JSON.stringify(resolutionCandidates), before);
});
test("unrecognized catalog codes and mismatched candidate cannot resolve", () => {
  const draft = updateResolutionDraft(candidate, completeDraft(candidate), { type: "catalog", field: "system", value: "NOT-A-DEMO-OPTION" });
  assert.ok(validateResolutionDraft(candidate, draft).blockers.some((b) => b.code === "CATALOG_SYSTEM"));
  assert.ok(validateResolutionDraft(candidate, { ...draft, candidateId: "MISMATCH" }).blockers.some((b) => b.code === "INVALID_CANDIDATE"));
});
test("all fixtures are obviously synthetic and have no production identifier fields", () => {
  for (const c of resolutionCandidates) {
    assert.equal(c.dataSource, "SYNTHETIC");
    assert.match(c.candidateId, /^DEMO-/);
    assert.match(c.observedRole, /^ROLE-DEMO-/);
    assert.ok(c.observedDepartments.every((d) => /^Department (Alpha|Beta|Gamma|Delta|Epsilon)$/.test(d)));
    assert.ok(c.approvers.every((p) => p.label.startsWith("Synthetic Approver ") && p.code.startsWith("APPROVER-DEMO-")));
  }
  assert.doesNotMatch(JSON.stringify(resolutionCandidates), /requestId|workId|entraObjectId|employeeId|@|[a-f0-9]{8}-[a-f0-9]{4}-/i);
});
