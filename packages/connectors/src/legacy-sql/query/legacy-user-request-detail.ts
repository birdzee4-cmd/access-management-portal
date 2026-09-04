import type { LegacySqlQuery } from "../types/index.js";
import { LEGACY_USER_REQUEST_TABLE } from "./legacy-user-request.js";
import { LEGACY_VSTS_TABLE } from "./legacy-user-request-vsts.js";

export const LEGACY_USER_REQUEST_DETAIL_LIMIT = 2;
export const MAX_RELATED_VSTS_ITEMS = 50;
const MAX_SQL_INT = 2_147_483_647;

export class LegacySharepointIdError extends Error {
  readonly code = "LEGACY_SHAREPOINT_ID_INVALID";

  constructor() {
    super("Legacy SharePoint ID must be a positive SQL integer.");
    this.name = "LegacySharepointIdError";
  }
}

export class LegacyRelatedVstsLimitError extends Error {
  readonly code = "LEGACY_RELATED_VSTS_LIMIT_INVALID";

  constructor() {
    super("Related VSTS item limit must be an integer between 1 and 50.");
    this.name = "LegacyRelatedVstsLimitError";
  }
}

export function enforceLegacySharepointId(idSharepoint: number): number {
  if (
    !Number.isSafeInteger(idSharepoint) ||
    idSharepoint < 1 ||
    idSharepoint > MAX_SQL_INT
  ) {
    throw new LegacySharepointIdError();
  }
  return idSharepoint;
}

export function enforceRelatedVstsLimit(
  limit = MAX_RELATED_VSTS_ITEMS,
): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RELATED_VSTS_ITEMS) {
    throw new LegacyRelatedVstsLimitError();
  }
  return limit;
}

/** Fixed TOP (2) lookup so source uniqueness is checked rather than assumed. */
export function buildLegacyUserRequestDetailQuery(
  idSharepoint: number,
): LegacySqlQuery {
  return {
    text:
      "SELECT TOP (@detailLimit) " +
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
      "[OpenCase] AS [openCaseStatus], " +
      "[CreateDate] AS [createdDateText], " +
      "[UpdateDate] AS [updatedDateText] " +
      "FROM " +
      LEGACY_USER_REQUEST_TABLE +
      " WHERE TRY_CONVERT(int, NULLIF(LTRIM(RTRIM([IDSharepoint])), N'')) = @idSharepoint",
    parameters: [
      { name: "detailLimit", value: LEGACY_USER_REQUEST_DETAIL_LIMIT },
      { name: "idSharepoint", value: enforceLegacySharepointId(idSharepoint) },
    ],
  };
}

/**
 * Reads at most 50 rows while COUNT_BIG OVER reports whether the safe response
 * is truncated. The request-origin reference is the confirmed zero-to-many key.
 */
export function buildRelatedVstsItemsQuery(
  idSharepoint: number,
  limit = MAX_RELATED_VSTS_ITEMS,
): LegacySqlQuery {
  return {
    text:
      "SELECT TOP (@limit) " +
      "[Work_ID] AS [workItemId], [State] AS [state], " +
      "COUNT_BIG(*) OVER () AS [relatedCount] " +
      "FROM " +
      LEGACY_VSTS_TABLE +
      " WHERE [IDSharepoint] = @idSharepoint " +
      "ORDER BY [Work_ID]",
    parameters: [
      { name: "limit", value: enforceRelatedVstsLimit(limit) },
      { name: "idSharepoint", value: enforceLegacySharepointId(idSharepoint) },
    ],
  };
}
