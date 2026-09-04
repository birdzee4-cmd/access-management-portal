import assert from "node:assert/strict";
import test from "node:test";

import type {
  LegacyProductManagementMatrixRow,
  MatrixSource,
} from "@access-portal/connectors";

import { LegacyCatalogService } from "./legacy-catalog.service.js";
import {
  analyzeLegacyMatrixRows,
  analyzeLegacyMatrixSources,
  maskLegacyManager,
  normalizeLegacyMatrixValue,
} from "./legacy-matrix-analysis.js";

const sampleRows: readonly LegacyProductManagementMatrixRow[] = [
  {
    roleName: " Reader ",
    manager: "alpha@example.invalid",
    department: " Operations ",
    active: "Yes",
  },
  {
    roleName: "reader",
    manager: "alpha@example.invalid",
    department: "operations",
    active: "yes",
  },
  {
    roleName: "Reader",
    manager: "beta@example.invalid",
    department: "Finance",
    active: "No",
  },
  {
    roleName: null,
    manager: " ",
    department: null,
    active: null,
  },
];

test("normalization trims values and converts null or blank values to null", () => {
  assert.equal(normalizeLegacyMatrixValue(" Reader "), "Reader");
  assert.equal(normalizeLegacyMatrixValue("   "), null);
  assert.equal(normalizeLegacyMatrixValue(null), null);
});

test("manager masking hides email local parts and non-email names", () => {
  assert.equal(maskLegacyManager("alpha@example.invalid"), "a***@example.invalid");
  assert.equal(maskLegacyManager("Manager Name"), "M***");
  assert.equal(maskLegacyManager(" "), null);
  assert.equal(maskLegacyManager(null), null);
});

test("matrix summary handles nulls, normalized duplicates, and mapping ambiguity", () => {
  const summary = analyzeLegacyMatrixRows("TH", sampleRows);

  assert.equal(summary.sampleCount, 4);
  assert.equal(summary.distinctRoleNameCount, 1);
  assert.equal(summary.distinctDepartmentCount, 2);
  assert.equal(summary.distinctManagerCount, 2);
  assert.equal(summary.fieldQuality.roleName.nullCount, 1);
  assert.equal(summary.fieldQuality.manager.blankCount, 1);
  assert.equal(summary.fieldQuality.department.trailingWhitespaceCount, 1);
  assert.equal(summary.fieldQuality.roleName.inconsistentCapitalizationGroups, 1);
  assert.equal(summary.normalizedDuplicateRows, 1);
  assert.equal(summary.normalizedDuplicateGroups, 1);
  assert.equal(summary.roleNamesWithMultipleManagers, 1);
  assert.equal(summary.roleNamesWithMultipleDepartments, 1);
});

test("cross-source analysis detects shared role and department context", () => {
  const emptyRows: readonly LegacyProductManagementMatrixRow[] = [];
  const rowsBySource: Record<
    MatrixSource,
    readonly LegacyProductManagementMatrixRow[]
  > = {
    NEW: sampleRows.slice(0, 1),
    TH: sampleRows.slice(1, 2),
    PH: emptyRows,
    VN_MY_ID: emptyRows,
  };

  const summary = analyzeLegacyMatrixSources(rowsBySource);

  assert.equal(summary.roleNamesPresentInMultipleSources, 1);
  assert.equal(summary.departmentRolePairsPresentInMultipleSources, 1);
  assert.equal(summary.preserveSourceContext, true);
});

test("LegacyCatalogService enforces the row cap before connector delegation", async () => {
  const calls: Array<readonly [MatrixSource, number | undefined]> = [];
  const service = new LegacyCatalogService({
    listProductManagementMatrix: async (source, limit) => {
      calls.push([source, limit]);
      return [];
    },
  });

  await service.getMatrixRows("VN_MY_ID", 20);
  assert.deepEqual(calls, [["VN_MY_ID", 20]]);
  await assert.rejects(async () => service.getMatrixRows("VN_MY_ID", 51));
  assert.deepEqual(calls, [["VN_MY_ID", 20]]);
});
