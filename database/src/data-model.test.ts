import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

interface DevelopmentFixture {
  readonly roles: readonly {
    readonly systemCode: string;
    readonly contextCode: string | null;
    readonly code: string;
    readonly name: string;
  }[];
  readonly approvalRules: readonly {
    readonly ruleCode: string;
    readonly version: number;
  }[];
  readonly approvalRuleApprovers: readonly {
    readonly ruleCode: string;
    readonly ruleVersion: number;
    readonly approverReference: string;
    readonly sequence: number | null;
  }[];
  readonly legacySources: readonly {
    readonly code: string;
    readonly sourceSystem: string;
    readonly sourceObject: string;
  }[];
  readonly legacyApprovalMappings: readonly {
    readonly sourceCode: string;
    readonly sourceRecordKey: string | null;
    readonly originalRoleName: string | null;
    readonly originalDepartment: string | null;
    readonly originalManagerReference: string | null;
    readonly normalizedRoleName: string | null;
    readonly normalizedDepartment: string | null;
    readonly normalizedManagerReference: string | null;
    readonly contextCode: string | null;
  }[];
}

const fixturePath = fileURLToPath(
  new URL("../seed/development.seed.json", import.meta.url),
);
const fixture = JSON.parse(
  readFileSync(fixturePath, "utf8"),
) as DevelopmentFixture;

test("the same role name is valid in separate access contexts", () => {
  const contextualRoles = fixture.roles.filter(
    (role) =>
      role.systemCode === "WMS" &&
      role.code === "OPERATOR" &&
      role.name === "Operator",
  );

  assert.equal(contextualRoles.length, 2);
  assert.deepEqual(
    new Set(contextualRoles.map((role) => role.contextCode)).size,
    2,
  );
});

test("one approval rule supports multiple approvers without invented decision semantics", () => {
  const rule = fixture.approvalRules.find(
    (candidate) => candidate.ruleCode === "DEMO-WMS-OPERATOR-APPROVAL",
  );
  assert.ok(rule);

  const approvers = fixture.approvalRuleApprovers.filter(
    (candidate) =>
      candidate.ruleCode === rule.ruleCode &&
      candidate.ruleVersion === rule.version,
  );

  assert.equal(approvers.length, 2);
  assert.equal(new Set(approvers.map(({ approverReference }) => approverReference)).size, 2);
  assert.ok(approvers.every(({ sequence }) => sequence === null));
});

test("legacy mapping preserves source and original values while normalizing whitespace", () => {
  const mapping = fixture.legacyApprovalMappings[0];
  assert.ok(mapping);
  assert.ok(
    fixture.legacySources.some(({ code }) => code === mapping.sourceCode),
  );
  assert.equal(mapping.sourceRecordKey, null);
  assert.equal(mapping.originalRoleName?.trim(), mapping.normalizedRoleName);
  assert.equal(
    mapping.originalDepartment?.trim(),
    mapping.normalizedDepartment,
  );
  assert.equal(
    mapping.originalManagerReference?.trim(),
    mapping.normalizedManagerReference,
  );
  assert.notEqual(mapping.originalRoleName, mapping.normalizedRoleName);
});

test("department, role, and context can map to more than one manager", () => {
  const mappings = fixture.legacyApprovalMappings.filter(
    (mapping) =>
      mapping.normalizedDepartment === "Demo Operations" &&
      mapping.normalizedRoleName === "Operator" &&
      mapping.contextCode === "DEMO_MARKET_A",
  );

  assert.equal(mappings.length, 2);
  assert.equal(
    new Set(mappings.map(({ normalizedManagerReference }) => normalizedManagerReference)).size,
    2,
  );
});
