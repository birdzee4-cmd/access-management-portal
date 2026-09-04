import assert from "node:assert/strict";
import test from "node:test";

import {
  LegacySqlReadGuardError,
  analyzeLegacyApprovalLifecycleRows,
  assertLegacySqlReadOnlyQuery,
  buildLegacyApprovalPresencePatternQuery,
  buildLegacyApprovalContinuationSummaryQuery,
  buildLegacyApprovalStatusDistributionQuery,
  buildLegacyCrossSourceDateOrderingQuery,
  buildLegacyDatePatternQuery,
  buildLegacyDateOrderingQuery,
  buildLegacyDateTimeSemanticsQuery,
  buildLegacyMultipleVstsSummaryQuery,
  buildLegacyMultipleVstsTypeStateQuery,
  buildLegacyOpenCaseCorrelationQuery,
  buildLegacyOpenCaseApprovalCorrelationQuery,
  buildLegacyOpenCaseStatusCorrelationQuery,
  buildLegacyStatusMismatchPatternQuery,
  buildLegacyStatusMismatchSummaryQuery,
  buildLegacyVstsDuplicateSummaryQuery,
  buildLegacyVstsStatusDistributionQuery,
  classifySemanticEvidence,
  type LegacyLifecycleSharePointObservation,
  type LegacyLifecycleVstsObservation,
} from "../src/legacy-sql/index.js";

const sharePointRows: readonly LegacyLifecycleSharePointObservation[] = [
  {
    idSharepoint: "100",
    workId: "1001",
    lineManagerStatus: " Approved ",
    ceoStatus: "Approved",
    itManagerStatus: "Pending",
    openCase: "Yes",
    statusVsts: "Active",
    createdDateText: "2026-01-01T08:00:00Z",
    updatedDateText: "2026-01-02T08:00:00+07:00",
  },
  {
    idSharepoint: "200",
    workId: "1002",
    lineManagerStatus: "approved",
    ceoStatus: " ",
    itManagerStatus: "Approved",
    openCase: "No",
    statusVsts: "Closed",
    createdDateText: "01/02/2026 08:00",
    updatedDateText: "02/02/2026 09:00",
  },
  {
    idSharepoint: "300",
    workId: null,
    lineManagerStatus: null,
    ceoStatus: null,
    itManagerStatus: null,
    openCase: "",
    statusVsts: "New",
    createdDateText: null,
    updatedDateText: null,
  },
  {
    idSharepoint: "400",
    workId: null,
    lineManagerStatus: "Rejected",
    ceoStatus: null,
    itManagerStatus: null,
    openCase: null,
    statusVsts: null,
    createdDateText: "synthetic-unparseable",
    updatedDateText: "synthetic-unparseable",
  },
];

const vstsRows: readonly LegacyLifecycleVstsObservation[] = [
  {
    idSharepoint: 100,
    workId: 1001,
    type: "Task",
    state: "active",
    createdDateText: "2026-01-01 09:00:00",
    updatedDateText: "2026-01-02 09:00:00",
  },
  {
    idSharepoint: 200,
    workId: 1002,
    type: "Task",
    state: "Closed",
    createdDateText: "2026-02-01 09:00:00",
    updatedDateText: "2026-02-02 09:00:00",
  },
  {
    idSharepoint: 200,
    workId: 1003,
    type: "Bug",
    state: "Resolved",
    createdDateText: "2026-02-01 10:00:00",
    updatedDateText: "2026-02-03 09:00:00",
  },
  {
    idSharepoint: 200,
    workId: 1003,
    type: "Bug",
    state: "Resolved",
    createdDateText: "2026-02-01 10:00:00",
    updatedDateText: "2026-02-03 09:00:00",
  },
  {
    idSharepoint: 300,
    workId: null,
    type: "Task",
    state: "Closed",
    createdDateText: null,
    updatedDateText: null,
  },
];

test("analysis normalizes status values and aggregates approval presence", () => {
  const summary = analyzeLegacyApprovalLifecycleRows(sharePointRows, vstsRows);

  assert.deepEqual(summary.approvalValues.lineManager, [
    { value: null, count: 1 },
    { value: "APPROVED", count: 2 },
    { value: "REJECTED", count: 1 },
  ]);
  assert.deepEqual(summary.approvalValues.ceo, [
    { value: null, count: 3 },
    { value: "APPROVED", count: 1 },
  ]);
  assert.equal(
    summary.approvalPresencePatterns.reduce((total, pattern) => total + pattern.count, 0),
    4,
  );
  assert.equal(summary.downstreamEvidence.ceoAbsentWithRelatedVsts, 2);
  assert.equal(summary.downstreamEvidence.itManagerAbsentWithRelatedVsts, 1);
});

test("OpenCase correlation, VSTS comparisons, and multiple-row shape are count-only", () => {
  const summary = analyzeLegacyApprovalLifecycleRows(sharePointRows, vstsRows);

  assert.deepEqual(summary.openCase.values, [
    { value: null, count: 2 },
    { value: "NO", count: 1 },
    { value: "YES", count: 1 },
  ]);
  assert.equal(summary.openCase.presentWithRelatedVsts, 2);
  assert.deepEqual(summary.statusComparison, {
    comparablePairs: 5,
    matchingPairs: 2,
    mismatchingPairs: 3,
    mismatchesOnMultipleVstsRequests: 2,
    mismatchesWithMissingSharePointWorkId: 1,
    mismatchesWithMissingVstsWorkId: 1,
  });
  assert.deepEqual(summary.multipleVsts, {
    requestCount: 1,
    relatedRowCount: 3,
    requestsWithDifferentWorkIds: 1,
    requestsWithDifferentTypes: 1,
    requestsWithDifferentStates: 1,
    exactDuplicateGroups: 1,
  });
});

test("date analysis never invents a timezone", () => {
  const summary = analyzeLegacyApprovalLifecycleRows(sharePointRows, vstsRows);

  assert.equal(summary.dateTime.sharePointCreatedMissing, 1);
  assert.equal(summary.dateTime.sharePointUpdatedMissing, 1);
  assert.equal(summary.dateTime.sharePointValuesWithExplicitOffset, 2);
  assert.equal(summary.dateTime.vstsCreatedMissing, 1);
  assert.equal(summary.dateTime.vstsUpdatedMissing, 1);
  assert.equal(summary.dateTime.vstsValuesWithExplicitOffset, 0);
  assert.equal(summary.dateTime.timezone, "UNKNOWN");
  assert.equal(
    summary.findings.find((finding) => finding.subject === "approval-ordering")?.classification,
    "UNKNOWN",
  );
  assert.equal(
    summary.findings.find((finding) => finding.subject === "ceo-stage-mandatory")?.classification,
    "CONTRADICTED",
  );
});

test("semantic evidence classification covers every supported label", () => {
  assert.equal(classifySemanticEvidence(0, 0, 0), "UNKNOWN");
  assert.equal(classifySemanticEvidence(4, 0, 4), "CONTRADICTED");
  assert.equal(classifySemanticEvidence(4, 3, 1), "LIKELY");
  assert.equal(classifySemanticEvidence(4, 4, 0, true), "LIKELY");
  assert.equal(classifySemanticEvidence(4, 4, 0), "CONFIRMED");
});

test("analysis output excludes identifiers, dates, extra PII, and logging", () => {
  const sensitiveEmail = "person@example.invalid";
  const sensitiveName = "Synthetic Person";
  const rowsWithExtraFields = sharePointRows.map((row) => ({
    ...row,
    requestEmail: sensitiveEmail,
    employeeName: sensitiveName,
  }));
  const originalLog = console.log;
  let logCalls = 0;
  console.log = () => {
    logCalls += 1;
  };
  let serialized = "";
  try {
    serialized = JSON.stringify(analyzeLegacyApprovalLifecycleRows(rowsWithExtraFields, vstsRows));
  } finally {
    console.log = originalLog;
  }

  for (const omitted of [
    sensitiveEmail,
    sensitiveName,
    "1001",
    "2026-01-01T08:00:00Z",
    "synthetic-unparseable",
  ]) {
    assert.equal(serialized.includes(omitted), false, omitted);
  }
  assert.equal(logCalls, 0);
});

test("lifecycle discovery queries are fixed aggregate SELECTs with no PII columns", () => {
  const queries = [
    buildLegacyApprovalStatusDistributionQuery(),
    buildLegacyApprovalPresencePatternQuery(),
    buildLegacyApprovalContinuationSummaryQuery(),
    buildLegacyOpenCaseCorrelationQuery(),
    buildLegacyOpenCaseStatusCorrelationQuery(),
    buildLegacyOpenCaseApprovalCorrelationQuery(),
    buildLegacyVstsStatusDistributionQuery(),
    buildLegacyMultipleVstsSummaryQuery(),
    buildLegacyVstsDuplicateSummaryQuery(),
    buildLegacyMultipleVstsTypeStateQuery(),
    buildLegacyStatusMismatchSummaryQuery(),
    buildLegacyStatusMismatchPatternQuery(),
    buildLegacyDateTimeSemanticsQuery(),
    buildLegacyDatePatternQuery(),
    buildLegacyDateOrderingQuery(),
    buildLegacyCrossSourceDateOrderingQuery(),
  ];

  for (const query of queries) {
    assert.equal(assertLegacySqlReadOnlyQuery(query.text), query.text);
    assert.match(query.text, /^SELECT\b/);
    assert.match(query.text, /COUNT_BIG|SUM\(/);
    assert.equal(/SELECT\s+\*/i.test(query.text), false);
    for (const omittedColumn of [
      "[RequestEmail]",
      "[CreateBy]",
      "[LineManager]",
      "[Assign]",
      "[Owner]",
      "[Title]",
      "[Description]",
      "[Detail]",
    ]) {
      assert.equal(query.text.includes(omittedColumn), false, omittedColumn);
    }
  }
});

test("central read-only guard remains active for lifecycle discovery", () => {
  for (const sql of [
    "INSERT INTO dbo.Example VALUES (1)",
    "UPDATE dbo.Example SET value = 1",
    "DELETE FROM dbo.Example",
    "EXEC dbo.Example",
    "SELECT * INTO dbo.Copy FROM dbo.Example",
  ]) {
    assert.throws(() => assertLegacySqlReadOnlyQuery(sql), LegacySqlReadGuardError);
  }
});
