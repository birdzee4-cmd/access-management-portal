import type { LegacySqlQuery } from "../types/index.js";

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
): LegacySqlQuery {
  const safeLimit = enforceLegacyUserRequestRowLimit(limit);
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
      LEGACY_USER_REQUEST_TABLE,
    parameters: [{ name: "limit", value: safeLimit }],
  };
}
