import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLegacySqlReadOnlyQuery, buildLegacyCatalogObservationsQuery,
  getLegacyProductManagementMatrixTable, matrixSources,
  type LegacySqlQuery, type MatrixSource,
} from "@access-portal/connectors";
import {
  analyzeCatalogObservations, normalizeCatalogSource, normalizeCatalogValue,
  type CatalogObservation,
} from "./legacy-catalog-mapping.js";
import { LegacyCatalogPreviewService } from "./legacy-catalog-preview.service.js";

const row = (overrides: Partial<CatalogObservation> = {}): CatalogObservation => ({
  source: "TH", roleName: "Synthetic Reader", department: "Synthetic Operations", active: "Yes", ...overrides,
});

test("catalog comparison trims, blanks to null, and compares stable case without rewriting names", () => {
  assert.equal(normalizeCatalogValue(" Product Admin "), "product admin");
  assert.equal(normalizeCatalogValue("PRODUCT ADMIN"), "product admin");
  assert.equal(normalizeCatalogValue(" \t "), null);
  assert.equal(normalizeCatalogValue(null), null);
  assert.equal(normalizeCatalogValue("A  B"), "a  b");
});

test("catalog sources normalize and preserve original provenance", () => {
  assert.equal(normalizeCatalogSource(" vn_my_id "), "VN_MY_ID");
  const c = analyzeCatalogObservations([row({ source: " th " })]).candidates[0]!;
  assert.equal(c.legacySource, "TH");
  assert.equal(c.observedSource, " th ");
});

test("catalog rejects unknown sources including object prototype keys", () => {
  for (const source of ["", "COUNTRY", "constructor", "__proto__", "TH; SELECT 1"]) {
    assert.throws(() => analyzeCatalogObservations([row({ source })]), /not allowed/);
    assert.throws(() => buildLegacyCatalogObservationsQuery(source as MatrixSource));
  }
});

test("same role and source retains every observation including exact duplicates", () => {
  const result = analyzeCatalogObservations([row(), row()]);
  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0]!.candidateIdentity, result.candidates[1]!.candidateIdentity);
  assert.equal(result.summary.candidateCodeCollisions, 0);
  assert.equal(result.summary.collisionGroups, 0);
});

test("same role across sources is flagged and never merged", () => {
  const result = analyzeCatalogObservations([row(), row({ source: "PH" })]);
  assert.equal(result.summary.roleNamesInMultipleSources, 1);
  assert.notEqual(result.candidates[0]!.candidateIdentity, result.candidates[1]!.candidateIdentity);
  assert.equal(result.candidates.length, 2);
  assert.deepEqual(result.collisions[0]!.candidateIndexes, [0, 1]);
});

test("Department cardinality is flagged without making Department a Role identity dimension", () => {
  const result = analyzeCatalogObservations([row(), row({ department: "Synthetic Finance" })]);
  assert.equal(result.summary.roleNamesInMultipleDepartments, 1);
  assert.equal(result.candidates[0]!.candidateIdentity, result.candidates[1]!.candidateIdentity);
  assert.notEqual(result.candidates[0]!.sourceFingerprint, result.candidates[1]!.sourceFingerprint);
  assert.equal(result.candidates.length, 2);
});

test("original whitespace and case variants are normalization collisions", () => {
  const result = analyzeCatalogObservations([row(), row({ roleName: " SYNTHETIC READER " })]);
  assert.equal(result.summary.normalizationCollisions, 1);
  assert.equal(result.candidates[1]!.observedRoleName, " SYNTHETIC READER ");
  assert.equal(result.candidates[0]!.classification, "COLLISION");
});

test("generated code collisions from punctuation remain separate candidates", () => {
  const result = analyzeCatalogObservations([row({ roleName: "Synthetic A-B" }), row({ roleName: "Synthetic A B" })]);
  assert.equal(result.summary.candidateCodeCollisions, 1);
  assert.equal(result.candidates[0]!.candidateRoleCode, result.candidates[1]!.candidateRoleCode);
  assert.notEqual(result.candidates[0]!.candidateIdentity, result.candidates[1]!.candidateIdentity);
  assert.equal(result.candidates.length, 2);
  assert.ok(result.candidates.every((c) => c.warnings.includes("ROLE_CODE_COLLISION")));
});

test("code length and non-ASCII fallback collisions are detected", () => {
  for (const names of [["S".repeat(120) + "A", "S".repeat(120) + "B"], ["讀者", "管理員"]]) {
    const result = analyzeCatalogObservations(names.map((roleName) => row({ roleName })));
    assert.equal(result.summary.candidateCodeCollisions, 1);
    assert.ok(result.candidates.every((c) => c.candidateRoleCode!.length <= 100));
  }
});

test("all catalog dimensions remain unresolved and context is not fabricated", () => {
  const result = analyzeCatalogObservations([row()]);
  const c = result.candidates[0]!;
  for (const key of ["systemResolution", "applicationResolution", "permissionResolution", "contextResolution"] as const) {
    assert.equal(c[key], "UNRESOLVED");
  }
  assert.equal(c.confidence, "UNKNOWN");
  assert.equal(c.roleNameClassification, "OBSERVED");
  assert.equal(c.roleCodeClassification, "GENERATED_CANDIDATE");
  assert.equal(result.summary.unresolvedSystems, 1);
  assert.equal(result.summary.unresolvedApplications, 1);
  assert.equal(result.summary.unresolvedPermissions, 1);
  assert.equal(result.summary.unresolvedContexts, 1);
});

test("missing role does not receive a fabricated role code", () => {
  const result = analyzeCatalogObservations([row({ roleName: " " }), row({ roleName: null })]);
  assert.equal(result.summary.uniqueNormalizedRoleNames, 0);
  assert.equal(result.summary.missingRoleNames, 2);
  assert.ok(result.candidates.every((c) => c.candidateRoleCode === null && c.warnings.includes("MISSING_ROLE_NAME")));
});

test("Active comparison preserves source values and has no lifecycle interpretation", () => {
  const result = analyzeCatalogObservations([row(), row({ active: " YES " })]);
  assert.equal(result.summary.conflictingActiveGroups, 0);
  assert.equal(result.candidates[1]!.observedActive, " YES ");
  assert.equal(result.candidates[1]!.normalizedActive, "yes");
  assert.equal(result.summary.uniqueNormalizedActiveValues, 1);
});

test("conflicting Active values are counted per source-role regardless of Department", () => {
  const result = analyzeCatalogObservations([row(), row({ active: "No", department: "Synthetic Finance" }), row({ source: "PH", active: "No" })]);
  assert.equal(result.summary.conflictingActiveGroups, 1);
  assert.deepEqual(result.collisions.find((c) => c.kind === "CONFLICTING_ACTIVE")!.candidateIndexes, [0, 1]);
});

test("missing Active and Department are unknown evidence rather than conflicts", () => {
  const result = analyzeCatalogObservations([row(), row({ active: null, department: null })]);
  assert.equal(result.summary.conflictingActiveGroups, 0);
  assert.equal(result.summary.roleNamesInMultipleDepartments, 0);
  assert.equal(result.summary.missingActiveValues, 1);
});

test("fingerprints are deterministic, normalized, and independent of input order", () => {
  const first = row();
  const second = row({ source: "PH" });
  const a = analyzeCatalogObservations([first, second]);
  const b = analyzeCatalogObservations([second, first]);
  assert.equal(a.candidates[0]!.sourceFingerprint, b.candidates[1]!.sourceFingerprint);
  const c = analyzeCatalogObservations([row({ source: " th ", roleName: " SYNTHETIC READER " })]);
  assert.equal(a.candidates[0]!.sourceFingerprint, c.candidates[0]!.sourceFingerprint);
  assert.match(c.candidates[0]!.sourceFingerprint, /^[a-f0-9]{64}$/);
  assert.notEqual(a.candidates[0]!.sourceFingerprint, a.candidates[1]!.sourceFingerprint);
});

test("extra person and database identifier fields cannot enter candidates or fingerprint inputs", () => {
  const extra = { ...row(), manager: "synthetic-person-marker", email: "synthetic-private-marker", id: "synthetic-row-marker" };
  const result = analyzeCatalogObservations([extra]);
  assert.deepEqual(result, analyzeCatalogObservations([row()]));
  assert.doesNotMatch(JSON.stringify(result), /manager|email|synthetic-person-marker|synthetic-private-marker|synthetic-row-marker/i);
});

test("empty analysis produces explicit zero counts for all four source partitions", () => {
  const result = analyzeCatalogObservations([]);
  assert.equal(result.summary.observationsAnalyzed, 0);
  assert.equal(result.summary.unresolvedCatalogIdentities, 0);
  assert.deepEqual(result.summary.provenance.map((p) => p.source), [...matrixSources]);
  assert.ok(result.summary.provenance.every((p) => p.observations === 0));
});

test("catalog queries use only allowlisted tables, explicit minimized columns and bounded parameters", () => {
  for (const source of matrixSources) {
    const query = buildLegacyCatalogObservationsQuery(source, 20);
    assert.equal(assertLegacySqlReadOnlyQuery(query.text), query.text);
    assert.equal(query.text, "SELECT TOP (@limit) [RoleName] AS [roleName], [Department] AS [department], [Active] AS [active] FROM " + getLegacyProductManagementMatrixTable(source));
    assert.doesNotMatch(query.text, /\*|Manager|INSERT|UPDATE|DELETE|MERGE|EXEC|CREATE|ALTER|DROP/i);
    assert.deepEqual(query.parameters, [{ name: "limit", value: 20 }]);
  }
  for (const limit of [0, -1, 51, 1.5, NaN, Infinity]) assert.throws(() => buildLegacyCatalogObservationsQuery("TH", limit));
});

test("central SELECT guard rejects mutation appended to catalog query", () => {
  const query = buildLegacyCatalogObservationsQuery("TH");
  for (const operation of ["INSERT", "UPDATE", "DELETE", "MERGE", "EXEC", "CREATE", "ALTER", "DROP"]) {
    assert.throws(() => assertLegacySqlReadOnlyQuery(query.text + "; " + operation + " synthetic"));
  }
});

test("internal preview calls a read-only port for four bounded samples and strips extra fields", async () => {
  const queries: LegacySqlQuery[] = [];
  const service = new LegacyCatalogPreviewService({
    async executeSelect<Row extends Record<string, unknown>>(query: LegacySqlQuery) {
      queries.push(query);
      return [{ roleName: "Synthetic Reader", department: "Synthetic Operations", active: true,
        manager: "synthetic-person-marker", employee: "synthetic-private-marker" }] as unknown as readonly Row[];
    },
  });
  const result = await service.preview(1);
  assert.equal(queries.length, 4);
  assert.equal(result.summary.observationsAnalyzed, 4);
  assert.equal(result.summary.roleNamesInMultipleSources, 1);
  assert.equal(result.summary.uniqueNormalizedRoleNames, 1);
  assert.ok(result.summary.provenance.every((p) => p.limitReached && p.limit === 1));
  assert.equal(result.summary.completeVocabulary, false);
  assert.equal(result.summary.stableOrdering, false);
  assert.doesNotMatch(JSON.stringify(result), /manager|employee|synthetic-person-marker|synthetic-private-marker/i);
  await assert.rejects(service.preview(51));
  assert.equal(queries.length, 4);
});

test("preview fails closed on oversized responses and malformed observation values", async () => {
  for (const rows of [[{}, {}], [{ roleName: { unsafe: true } }]]) {
    const service = new LegacyCatalogPreviewService({
      async executeSelect<Row extends Record<string, unknown>>() { return rows as unknown as readonly Row[]; },
    });
    await assert.rejects(service.preview(1));
  }
});
