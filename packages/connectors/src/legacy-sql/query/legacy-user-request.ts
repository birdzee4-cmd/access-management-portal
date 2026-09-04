import type { LegacyUserRequestFilters } from "@access-portal/contracts";

import type { LegacySqlParameter, LegacySqlQuery } from "../types/index.js";

export const LEGACY_USER_REQUEST_TABLE =
  "[dbo].[All_SharepointUserRequest]" as const;
export const MAX_LEGACY_USER_REQUEST_ROWS = 50;

export class LegacyUserRequestRowLimitError extends Error {
  readonly code = "LEGACY_USER_REQUEST_ROW_LIMIT_INVALID";

  constructor() {
    super("Legacy User Request row limit must be an integer between 1 and 50.");
    this.name = "LegacyUserRequestRowLimitError";
  }
}

export const legacyUserRequestFilterKeys = [
  "system",
  "country",
  "vstsStatus",
  "department",
] as const;

export type LegacyUserRequestFilterKey =
  (typeof legacyUserRequestFilterKeys)[number];

const filterMaximumLengths: Readonly<
  Record<LegacyUserRequestFilterKey, number>
> = {
  system: 200,
  country: 100,
  vstsStatus: 200,
  department: 200,
};

export class LegacyUserRequestFilterError extends Error {
  readonly code = "LEGACY_USER_REQUEST_FILTER_INVALID";

  constructor() {
    super("Legacy User Request filters are invalid.");
    this.name = "LegacyUserRequestFilterError";
  }
}

export function normalizeLegacyUserRequestFilters(
  filters: LegacyUserRequestFilters = {},
): LegacyUserRequestFilters {
  const allowedKeys = new Set<string>(legacyUserRequestFilterKeys);
  if (Object.keys(filters).some((key) => !allowedKeys.has(key))) {
    throw new LegacyUserRequestFilterError();
  }

  const normalized: {
    system?: string;
    country?: string;
    vstsStatus?: string;
    department?: string;
  } = {};

  for (const key of legacyUserRequestFilterKeys) {
    const value = filters[key];
    if (value === undefined) continue;
    if (typeof value !== "string") throw new LegacyUserRequestFilterError();

    const trimmed = value.trim();
    if (
      !trimmed ||
      trimmed.length > filterMaximumLengths[key] ||
      /[\u0000-\u001f\u007f]/.test(trimmed)
    ) {
      throw new LegacyUserRequestFilterError();
    }
    normalized[key] = trimmed;
  }

  return normalized;
}

export function enforceLegacyUserRequestRowLimit(
  limit = MAX_LEGACY_USER_REQUEST_ROWS,
): number {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LEGACY_USER_REQUEST_ROWS
  ) {
    throw new LegacyUserRequestRowLimitError();
  }

  return limit;
}

/**
 * Fixed, bounded projection from the one approved legacy User Request table.
 * No HTTP value can affect an identifier or SQL fragment.
 */
export function buildLegacyUserRequestListQuery(
  limit = MAX_LEGACY_USER_REQUEST_ROWS,
  filters: LegacyUserRequestFilters = {},
): LegacySqlQuery {
  const safeLimit = enforceLegacyUserRequestRowLimit(limit);
  const safeFilters = normalizeLegacyUserRequestFilters(filters);
  const predicates: string[] = [];
  const parameters: LegacySqlParameter[] = [
    { name: "limit", value: safeLimit },
  ];

  if (safeFilters.system) {
    predicates.push("LTRIM(RTRIM([SystemProgram])) = @system");
    parameters.push({ name: "system", value: safeFilters.system });
  }
  if (safeFilters.country) {
    predicates.push("LTRIM(RTRIM([Country])) = @country");
    parameters.push({ name: "country", value: safeFilters.country });
  }
  if (safeFilters.vstsStatus) {
    predicates.push("LTRIM(RTRIM([StatusVSTS])) = @vstsStatus");
    parameters.push({ name: "vstsStatus", value: safeFilters.vstsStatus });
  }
  if (safeFilters.department) {
    predicates.push("LTRIM(RTRIM([Department])) = @department");
    parameters.push({ name: "department", value: safeFilters.department });
  }

  return {
    text:
      "SELECT TOP (@limit) " +
      "[IDSharepoint] AS [externalRequestId], " +
      "[Work_ID] AS [workItemId], " +
      "[Company] AS [company], " +
      "[Department] AS [department], " +
      "[Country] AS [country], " +
      "[SystemProgram] AS [system], " +
      "[Permission] AS [permission], " +
      "[StatusLineManager] AS [lineManagerApprovalStatus], " +
      "[StatusCEOApprove] AS [ceoApprovalStatus], " +
      "[StatusITManager] AS [itManagerApprovalStatus], " +
      "[StatusVSTS] AS [vstsStatus], " +
      "[CreateDate] AS [createdDateText], " +
      "[UpdateDate] AS [updatedDateText] " +
      "FROM " +
      LEGACY_USER_REQUEST_TABLE +
      (predicates.length > 0 ? " WHERE " + predicates.join(" AND ") : ""),
    parameters,
  };
}
