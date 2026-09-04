import type {
  LegacyProductManagementMatrixRow,
  MatrixSource,
} from "@access-portal/connectors";

type LegacyMatrixField = keyof LegacyProductManagementMatrixRow;

export interface LegacyMatrixFieldQuality {
  readonly nullCount: number;
  readonly blankCount: number;
  readonly trailingWhitespaceCount: number;
  readonly inconsistentCapitalizationGroups: number;
}

export interface LegacyMatrixSummary {
  readonly source: MatrixSource;
  readonly sampleCount: number;
  readonly distinctRoleNameCount: number;
  readonly distinctDepartmentCount: number;
  readonly distinctManagerCount: number;
  readonly activeValuePatterns: readonly {
    readonly value: string;
    readonly count: number;
  }[];
  readonly fieldQuality: Readonly<
    Record<LegacyMatrixField, LegacyMatrixFieldQuality>
  >;
  readonly normalizedDuplicateRows: number;
  readonly normalizedDuplicateGroups: number;
  readonly roleNamesWithMultipleManagers: number;
  readonly roleNamesWithMultipleDepartments: number;
  readonly departmentRolePairsWithMultipleManagers: number;
}

export interface LegacyMatrixCrossSourceSummary {
  readonly roleNamesPresentInMultipleSources: number;
  readonly departmentRolePairsPresentInMultipleSources: number;
  readonly sharedRoleNamesWithMultipleManagers: number;
  readonly preserveSourceContext: true;
}

export function normalizeLegacyMatrixValue(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function comparisonKey(value: string | null): string | null {
  return normalizeLegacyMatrixValue(value)?.toLocaleLowerCase("en-US") ?? null;
}

export function maskLegacyManager(value: string | null): string | null {
  const normalized = normalizeLegacyMatrixValue(value);
  if (!normalized) {
    return null;
  }

  const atIndex = normalized.indexOf("@");
  if (atIndex > 0 && atIndex < normalized.length - 1) {
    return normalized.slice(0, 1) + "***" + normalized.slice(atIndex);
  }

  return normalized.slice(0, 1) + "***";
}

function countDistinct(
  rows: readonly LegacyProductManagementMatrixRow[],
  field: LegacyMatrixField,
): number {
  return new Set(
    rows
      .map((row) => comparisonKey(row[field]))
      .filter((value): value is string => value !== null),
  ).size;
}

function analyzeField(
  rows: readonly LegacyProductManagementMatrixRow[],
  field: LegacyMatrixField,
): LegacyMatrixFieldQuality {
  let nullCount = 0;
  let blankCount = 0;
  let trailingWhitespaceCount = 0;
  const capitalizationVariants = new Map<string, Set<string>>();

  for (const row of rows) {
    const rawValue = row[field];
    if (rawValue === null) {
      nullCount += 1;
      continue;
    }

    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      blankCount += 1;
      continue;
    }

    if (trimmed !== rawValue) {
      trailingWhitespaceCount += 1;
    }

    const key = trimmed.toLocaleLowerCase("en-US");
    const variants = capitalizationVariants.get(key) ?? new Set<string>();
    variants.add(trimmed);
    capitalizationVariants.set(key, variants);
  }

  return {
    nullCount,
    blankCount,
    trailingWhitespaceCount,
    inconsistentCapitalizationGroups: [...capitalizationVariants.values()].filter(
      (variants) => variants.size > 1,
    ).length,
  };
}

function addToNestedSet<Value extends string>(
  map: Map<string, Set<Value>>,
  key: string | null,
  value: Value | null,
): void {
  if (!key || !value) {
    return;
  }

    const values = map.get(key) ?? new Set<Value>();
  values.add(value);
  map.set(key, values);
}

export function analyzeLegacyMatrixRows(
  source: MatrixSource,
  rows: readonly LegacyProductManagementMatrixRow[],
): LegacyMatrixSummary {
  const duplicateCounts = new Map<string, number>();
  const managersByRole = new Map<string, Set<string>>();
  const departmentsByRole = new Map<string, Set<string>>();
  const managersByDepartmentRole = new Map<string, Set<string>>();
  const activeCounts = new Map<string, number>();

  for (const row of rows) {
    const role = comparisonKey(row.roleName);
    const manager = comparisonKey(row.manager);
    const department = comparisonKey(row.department);
    const active = normalizeLegacyMatrixValue(row.active);
    const rowKey = JSON.stringify([role, manager, department, comparisonKey(row.active)]);
    duplicateCounts.set(rowKey, (duplicateCounts.get(rowKey) ?? 0) + 1);

    addToNestedSet(managersByRole, role, manager);
    addToNestedSet(departmentsByRole, role, department);
    addToNestedSet(
      managersByDepartmentRole,
      role && department ? department + "\u0000" + role : null,
      manager,
    );

    const activePattern = active ?? "(NULL_OR_BLANK)";
    activeCounts.set(activePattern, (activeCounts.get(activePattern) ?? 0) + 1);
  }

  return {
    source,
    sampleCount: rows.length,
    distinctRoleNameCount: countDistinct(rows, "roleName"),
    distinctDepartmentCount: countDistinct(rows, "department"),
    distinctManagerCount: countDistinct(rows, "manager"),
    activeValuePatterns: [...activeCounts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value)),
    fieldQuality: {
      roleName: analyzeField(rows, "roleName"),
      manager: analyzeField(rows, "manager"),
      department: analyzeField(rows, "department"),
      active: analyzeField(rows, "active"),
    },
    normalizedDuplicateRows: [...duplicateCounts.values()].reduce(
      (total, count) => total + Math.max(0, count - 1),
      0,
    ),
    normalizedDuplicateGroups: [...duplicateCounts.values()].filter(
      (count) => count > 1,
    ).length,
    roleNamesWithMultipleManagers: [...managersByRole.values()].filter(
      (managers) => managers.size > 1,
    ).length,
    roleNamesWithMultipleDepartments: [...departmentsByRole.values()].filter(
      (departments) => departments.size > 1,
    ).length,
    departmentRolePairsWithMultipleManagers: [
      ...managersByDepartmentRole.values(),
    ].filter((managers) => managers.size > 1).length,
  };
}

export function analyzeLegacyMatrixSources(
  rowsBySource: Readonly<
    Record<MatrixSource, readonly LegacyProductManagementMatrixRow[]>
  >,
): LegacyMatrixCrossSourceSummary {
  const sourcesByRole = new Map<string, Set<MatrixSource>>();
  const sourcesByDepartmentRole = new Map<string, Set<MatrixSource>>();
  const managersBySharedRole = new Map<string, Set<string>>();

  for (const [source, rows] of Object.entries(rowsBySource) as [
    MatrixSource,
    readonly LegacyProductManagementMatrixRow[],
  ][]) {
    for (const row of rows) {
      const role = comparisonKey(row.roleName);
      const department = comparisonKey(row.department);
      const manager = comparisonKey(row.manager);
      if (!role) {
        continue;
      }

      addToNestedSet(sourcesByRole, role, source);
      addToNestedSet(managersBySharedRole, role, manager);
      if (department) {
        addToNestedSet(
          sourcesByDepartmentRole,
          department + "\u0000" + role,
          source,
        );
      }
    }
  }

  const sharedRoles = new Set(
    [...sourcesByRole.entries()]
      .filter(([, sources]) => sources.size > 1)
      .map(([role]) => role),
  );

  return {
    roleNamesPresentInMultipleSources: sharedRoles.size,
    departmentRolePairsPresentInMultipleSources: [
      ...sourcesByDepartmentRole.values(),
    ].filter((sources) => sources.size > 1).length,
    sharedRoleNamesWithMultipleManagers: [...sharedRoles].filter(
      (role) => (managersBySharedRole.get(role)?.size ?? 0) > 1,
    ).length,
    preserveSourceContext: true,
  };
}
