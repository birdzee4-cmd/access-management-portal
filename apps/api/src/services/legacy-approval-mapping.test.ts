import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  assertLegacySqlReadOnlyQuery, buildLegacyProductManagementMatrixQuery,
  getLegacyProductManagementMatrixTable, matrixSources,
  type LegacySqlQuery, type MatrixSource,
} from "@access-portal/connectors";
import { analyzeCatalogObservations } from "./legacy-catalog-mapping.js";
import {
  analyzeApprovalObservations, findUnexpectedFingerprintCollisions,
  normalizeApprovalSource, normalizeApprovalValue, type ApprovalObservation,
} from "./legacy-approval-mapping.js";
import { LegacyApprovalPreviewService } from "./legacy-approval-preview.service.js";

const row = (overrides: Partial<ApprovalObservation> = {}): ApprovalObservation => ({
  source: "TH", roleName: "Synthetic Reader", department: "Synthetic Operations",
  manager: "Synthetic Person Alpha", active: "Yes", ...overrides,
});
const catalogs = (rows: readonly ApprovalObservation[]) => analyzeCatalogObservations(rows.map((r) => ({
  source: r.source, roleName: r.roleName, department: r.department, active: r.active,
}))).candidates;

test("approval normalization trims Manager, blanks to null and uses stable case comparison", () => {
  assert.equal(normalizeApprovalValue(" Synthetic Person Alpha "), "synthetic person alpha");
  assert.equal(normalizeApprovalValue("SYNTHETIC PERSON ALPHA"), "synthetic person alpha");
  assert.equal(normalizeApprovalValue(" \t "), null);
  assert.equal(normalizeApprovalValue(null), null);
  assert.equal(normalizeApprovalValue("Product Admin"), "product admin");
  assert.equal(normalizeApprovalSource(" vn_my_id "), "VN_MY_ID");
});

test("one observed Manager yields an inactive analysis candidate with unknown semantics", () => {
  const result = analyzeApprovalObservations([row()]);
  assert.equal(result.summary.approvalRuleCandidates, 1);
  assert.equal(result.summary.oneManagerCandidates, 1);
  const c = result.candidates[0]!;
  assert.equal(c.approvalMode, "UNKNOWN");
  assert.equal(c.approvalScopeResolution, "UNRESOLVED");
  assert.equal(c.sequenceResolution, "UNRESOLVED");
  assert.equal(c.confidence, "UNKNOWN");
  assert.equal(c.approvers[0]!.managerObservation, "OBSERVED");
  assert.equal(c.approvers[0]!.identityResolution, "UNRESOLVED");
  assert.equal(c.approvers[0]!.identityType, "UNKNOWN");
  assert.equal(c.approvers[0]!.decisionSemantics, "UNKNOWN");
  assert.equal(c.approvers[0]!.sequence, null);
  assert.equal(c.approvers[0]!.sequenceResolution, "UNRESOLVED");
});

test("multiple Manager observations stay separate without ANY ALL or SEQUENTIAL inference", () => {
  const result = analyzeApprovalObservations([row(), row({ manager: "Synthetic Person Beta" })]);
  const c = result.candidates[0]!;
  assert.equal(c.approvers.length, 2);
  assert.equal(c.observations.length, 2);
  assert.equal(c.distinctManagerCount, 2);
  assert.equal(result.summary.multiManagerCandidates, 1);
  assert.equal(result.summary.maxManagersPerCandidate, 2);
  assert.equal(c.approvalMode, "UNKNOWN");
  assert.ok(c.approvers.every((a) => a.sequence === null && a.decisionSemantics === "UNKNOWN"));
  assert.ok(c.warnings.includes("MULTIPLE_MANAGERS"));
});

test("null and blank Managers retain unavailable placeholders without fabricated identities", () => {
  const result = analyzeApprovalObservations([row({ manager: null }), row({ manager: " " })]);
  assert.equal(result.summary.blankOrNullManagers, 2);
  assert.equal(result.summary.approverObservations, 0);
  assert.equal(result.summary.approverCandidateEntries, 2);
  assert.equal(result.summary.unresolvedIdentities, 2);
  assert.equal(result.summary.noManagerCandidates, 1);
  assert.ok(result.candidates[0]!.approvers.every((a) => a.managerObservation === "UNAVAILABLE"));
});

test("duplicates and normalized Manager variants are not removed", () => {
  const result = analyzeApprovalObservations([row(), row(), row({ manager: " SYNTHETIC PERSON ALPHA " })]);
  assert.equal(result.summary.approverObservations, 3);
  assert.equal(result.candidates[0]!.approvers.length, 3);
  assert.equal(result.summary.oneManagerCandidates, 1);
  assert.equal(result.summary.normalizationCollisions, 1);
  assert.equal(new Set(result.candidates[0]!.approvers.map((a) => a.candidateFingerprint)).size, 1);
});

test("same role across departments remains separate hypothetical scopes", () => {
  const result = analyzeApprovalObservations([row(), row({ department: "Synthetic Finance" })]);
  assert.equal(result.summary.approvalRuleCandidates, 2);
  assert.equal(result.summary.departmentAmbiguities, 1);
  assert.equal(result.summary.sharedManagerGroups, 1);
  assert.notEqual(result.candidates[0]!.candidateFingerprint, result.candidates[1]!.candidateFingerprint);
  assert.ok(result.candidates.every((c) => c.approvalScopeResolution === "UNRESOLVED"));
});

test("source crossing detects different populated Manager sets", () => {
  const result = analyzeApprovalObservations([row(), row({ source: "PH", manager: "Synthetic Person Beta" })]);
  assert.equal(result.summary.approvalRuleCandidates, 2);
  assert.equal(result.summary.sourceCrossingCollisions, 1);
  assert.equal(result.summary.roleDepartmentMultipleManagers, 1);
  assert.notEqual(result.candidates[0]!.candidateFingerprint, result.candidates[1]!.candidateFingerprint);
});

test("equivalent Manager sets and missing evidence do not assert source conflicts", () => {
  for (const manager of ["SYNTHETIC PERSON ALPHA", null]) {
    const result = analyzeApprovalObservations([row(), row({ source: "PH", manager })]);
    assert.equal(result.summary.sourceCrossingCollisions, 0);
    assert.equal(result.candidates.length, 2);
  }
});

test("same normalized Manager is flagged across different rule candidates", () => {
  const result = analyzeApprovalObservations([row(), row({ roleName: "Synthetic Writer", manager: " synthetic person alpha " })]);
  assert.equal(result.summary.sharedManagerGroups, 1);
  assert.ok(result.candidates.every((c) => c.warnings.includes("SHARED_MANAGER")));
  assert.ok(result.candidates.every((c) => c.approvers[0]!.identityResolution === "UNRESOLVED"));
});

test("normalization collisions cover every observed field and preserve non-person originals", () => {
  const result = analyzeApprovalObservations([row(), row({ source: " th ", roleName: " SYNTHETIC READER ",
    department: " SYNTHETIC OPERATIONS ", manager: " SYNTHETIC PERSON ALPHA ", active: " YES " })]);
  assert.equal(result.summary.normalizationCollisions, 5);
  assert.equal(result.candidates[0]!.observations[1]!.observedRoleName, " SYNTHETIC READER ");
  assert.equal(result.candidates[0]!.observations[1]!.observedActive, " YES ");
});

test("Active conflicts are observations only and do not split or activate a hypothetical scope", () => {
  const result = analyzeApprovalObservations([row(), row({ active: "No" })]);
  assert.equal(result.summary.conflictingActiveGroups, 1);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.observations.length, 2);
  assert.equal(result.candidates[0]!.approvalMode, "UNKNOWN");
  assert.ok(!("active" in result.candidates[0]!));
});

test("consistent or missing Active values are not inferred lifecycle conflicts", () => {
  for (const active of [null, " YES "]) assert.equal(
    analyzeApprovalObservations([row(), row({ active })]).summary.conflictingActiveGroups, 0);
});

test("unique synthetic catalog observation link resolves correlation only", () => {
  const input = [row()];
  const catalog = catalogs(input);
  const result = analyzeApprovalObservations(input, catalog);
  assert.equal(result.candidates[0]!.catalogLinkResolution, "RESOLVED");
  assert.equal(result.candidates[0]!.catalogCandidateFingerprint, catalog[0]!.sourceFingerprint);
  assert.equal(result.candidates[0]!.approvalScopeResolution, "UNRESOLVED");
  assert.equal(catalog[0]!.systemResolution, "UNRESOLVED");
  assert.equal(result.summary.unresolvedCatalogLinks, 0);
});

test("absent catalog, missing scope and unrelated provenance remain unresolved", () => {
  for (const input of [row(), row({ roleName: null }), row({ department: null })]) {
    const result = analyzeApprovalObservations([input], catalogs([row({ source: "PH" })]));
    assert.equal(result.candidates[0]!.catalogLinkResolution, "UNRESOLVED");
    assert.equal(result.candidates[0]!.catalogCandidateFingerprint, null);
  }
  assert.equal(analyzeApprovalObservations([row()]).summary.unresolvedCatalogLinks, 1);
});

test("duplicate catalog candidates fail closed without silently selecting the first", () => {
  const input = [row(), row({ manager: "Synthetic Person Beta" })];
  const result = analyzeApprovalObservations(input, catalogs(input));
  assert.equal(result.candidates[0]!.catalogLinkResolution, "COLLISION");
  assert.equal(result.candidates[0]!.catalogCandidateFingerprint, null);
  assert.equal(result.summary.unresolvedCatalogLinks, 1);
  assert.equal(result.summary.catalogLinkCollisions, 1);
});

test("existing catalog collision warnings prevent linking even a single matching observation", () => {
  const input = [row(), row({ source: "PH" })];
  const result = analyzeApprovalObservations([input[0]!], catalogs(input));
  assert.equal(result.candidates[0]!.catalogLinkResolution, "COLLISION");
});

test("matching hash with mismatched catalog fields cannot establish a link", () => {
  const catalog = catalogs([row()]);
  const result = analyzeApprovalObservations([row()], [{ ...catalog[0]!, normalizedDepartment: "other" }]);
  assert.equal(result.candidates[0]!.catalogLinkResolution, "UNRESOLVED");
});

test("multiple Active provenance values cannot attach to a partial single catalog observation", () => {
  const result = analyzeApprovalObservations([row(), row({ active: "No" })], catalogs([row()]));
  assert.equal(result.candidates[0]!.catalogLinkResolution, "UNRESOLVED");
});

test("fingerprints are deterministic and independent of row order or unrelated database IDs", () => {
  const input = [row(), row({ manager: "Synthetic Person Beta" })];
  const first = analyzeApprovalObservations(input).candidates[0]!;
  const second = analyzeApprovalObservations([...input].reverse()).candidates[0]!;
  assert.equal(first.candidateFingerprint, second.candidateFingerprint);
  assert.deepEqual(first.approvers.map((a) => a.candidateFingerprint).sort(), second.approvers.map((a) => a.candidateFingerprint).sort());
  assert.equal(analyzeApprovalObservations([{ ...row(), id: "synthetic-id" } as ApprovalObservation]).candidates[0]!.candidateFingerprint, first.candidateFingerprint);
  assert.match(first.approvers[0]!.candidateFingerprint, /^[a-f0-9]{64}$/);
});

test("unexpected digest collisions are reported while identical canonical repetitions are allowed", () => {
  assert.deepEqual(findUnexpectedFingerprintCollisions([
    { canonical: "synthetic-a", fingerprint: "same" }, { canonical: "synthetic-b", fingerprint: "same" },
    { canonical: "synthetic-a", fingerprint: "same" },
  ]), [[0, 1, 2]]);
  assert.deepEqual(findUnexpectedFingerprintCollisions([
    { canonical: "synthetic-a", fingerprint: "same" }, { canonical: "synthetic-a", fingerprint: "same" },
  ]), []);
  assert.equal(analyzeApprovalObservations([row(), row()]).summary.unexpectedFingerprintCollisions, 0);
});

test("raw and normalized Manager values and person IDs are absent from all result serialization", () => {
  const input = { ...row(), manager: " SYNTHETIC_PRIVATE_MANAGER_MARKER ", employeeId: "synthetic-private-id" };
  const result = analyzeApprovalObservations([input]);
  assert.doesNotMatch(JSON.stringify(result), /synthetic_private_manager_marker|synthetic-private-id|originalManagerValue|normalizedManagerValue/i);
  assert.doesNotMatch(JSON.stringify(result.summary), /[a-f0-9]{64}|Synthetic Reader|Synthetic Operations/);
});

test("empty input produces zero counts and all four fixed provenance labels", () => {
  const result = analyzeApprovalObservations([]);
  assert.equal(result.summary.approvalRuleCandidates, 0);
  assert.equal(result.summary.maxManagersPerCandidate, 0);
  assert.deepEqual(result.summary.provenance.map((p) => p.source), [...matrixSources]);
});

test("grouping comparison distinguishes role, department, source and full observation scope", () => {
  const result = analyzeApprovalObservations([row(), row({ department: "Synthetic Finance" }), row({ source: "PH" })]);
  assert.deepEqual(Object.values(result.summary.groupingComparisons).map((g) => g.groups), [1, 2, 2, 3]);
});

test("approval reads use the existing fixed four-column SELECT and bounded parameters", () => {
  for (const source of matrixSources) {
    const query = buildLegacyProductManagementMatrixQuery(source, 20);
    assert.equal(assertLegacySqlReadOnlyQuery(query.text), query.text);
    assert.equal(query.text, "SELECT TOP (@limit) [RoleName] AS [roleName], [Manager] AS [manager], [Department] AS [department], [Active] AS [active] FROM " + getLegacyProductManagementMatrixTable(source));
    assert.deepEqual(query.parameters, [{ name: "limit", value: 20 }]);
    assert.doesNotMatch(query.text, /\*/);
  }
  for (const source of ["", "UNKNOWN", "__proto__", "TH; SELECT 1"]) {
    assert.throws(() => analyzeApprovalObservations([row({ source })]));
    assert.throws(() => buildLegacyProductManagementMatrixQuery(source as MatrixSource));
  }
  for (const operation of ["INSERT", "UPDATE", "DELETE", "MERGE", "EXEC", "CREATE", "ALTER", "DROP"]) {
    assert.throws(() => assertLegacySqlReadOnlyQuery(buildLegacyProductManagementMatrixQuery("TH").text + "; " + operation + " synthetic"));
  }
});

test("preview uses only four SELECT calls and produces counts-only reporting without another catalog read", async () => {
  const calls: LegacySqlQuery[] = [];
  const service = new LegacyApprovalPreviewService({
    async executeSelect<Row extends Record<string, unknown>>(query: LegacySqlQuery) {
      calls.push(query);
      return [{ ...row(), manager: "SYNTHETIC_PRIVATE_MANAGER_MARKER" }] as unknown as readonly Row[];
    },
  });
  const result = await service.summarize(1);
  assert.equal(calls.length, 4);
  assert.equal(result.observationsAnalyzed, 4);
  assert.equal(result.unresolvedIdentities, 4);
  assert.equal(result.approvalModeUnknown, 4);
  assert.equal(result.sequenceUnresolved, 4);
  assert.ok(result.samples.every((s) => s.limitReached && s.limit === 1));
  assert.equal(result.completeVocabulary, false);
  assert.equal(result.stableOrdering, false);
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC_PRIVATE_MANAGER_MARKER|[a-f0-9]{64}|Synthetic Reader/);
  for (const limit of [0, -1, 51, 1.5, NaN]) await assert.rejects(service.preview(limit));
  assert.equal(calls.length, 4);
});

test("preview rejects oversized responses and malformed values without leaking them", async () => {
  for (const rows of [[{}, {}], [{ manager: { privateMarker: true } }]]) {
    const service = new LegacyApprovalPreviewService({
      async executeSelect<Row extends Record<string, unknown>>() { return rows as unknown as readonly Row[]; },
    });
    await assert.rejects(service.preview(1), (error: Error) => !error.message.includes("privateMarker"));
  }
});

test("approval modules have no identity lookup, persistence, logging or workflow dependencies", () => {
  for (const name of ["legacy-approval-mapping.ts", "legacy-approval-preview.service.ts"]) {
    const source = readFileSync(new URL("../../src/services/" + name, import.meta.url), "utf8");
    assert.doesNotMatch(source, /console\.|fetch\(|@microsoft|@azure\/msal|@access-portal\/database|Prisma|\.save\(|\.create\(|\.delete\(/);
  }
});
