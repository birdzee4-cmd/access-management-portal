import {
  MAX_LEGACY_USER_REQUEST_ROWS,
  enforceLegacyUserRequestRowLimit,
  type LegacyUserRequestRow,
  type ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import type {
  LegacyUserRequestFilters,
  LegacyUserRequestSummary,
} from "@access-portal/contracts";

export type LegacyUserRequestReader = Pick<
  ReadOnlyLegacySqlConnector,
  "listLegacyUserRequests"
>;

function normalizeSourceText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeLegacyUserRequest(
  row: LegacyUserRequestRow,
): LegacyUserRequestSummary {
  return {
    externalRequestId: normalizeSourceText(row.externalRequestId),
    workItemId: normalizeSourceText(row.workItemId),
    company: normalizeSourceText(row.company),
    department: normalizeSourceText(row.department),
    country: normalizeSourceText(row.country),
    system: normalizeSourceText(row.system),
    permission: normalizeSourceText(row.permission),
    lineManagerApprovalStatus: normalizeSourceText(
      row.lineManagerApprovalStatus,
    ),
    ceoApprovalStatus: normalizeSourceText(row.ceoApprovalStatus),
    itManagerApprovalStatus: normalizeSourceText(row.itManagerApprovalStatus),
    vstsStatus: normalizeSourceText(row.vstsStatus),
    createdDateText: normalizeSourceText(row.createdDateText),
    updatedDateText: normalizeSourceText(row.updatedDateText),
  };
}

/** On-demand, bounded normalization over the guarded read-only connector. */
export class LegacyUserRequestService {
  constructor(private readonly legacySql: LegacyUserRequestReader) {}

  async listRequests(
    limit = MAX_LEGACY_USER_REQUEST_ROWS,
    filters: LegacyUserRequestFilters = {},
  ): Promise<readonly LegacyUserRequestSummary[]> {
    const safeLimit = enforceLegacyUserRequestRowLimit(limit);
    const rows = await this.legacySql.listLegacyUserRequests(
      safeLimit,
      filters,
    );
    if (rows.length > safeLimit) {
      throw new Error("Legacy User Request reader exceeded the requested limit.");
    }
    return rows.map(normalizeLegacyUserRequest);
  }
}
