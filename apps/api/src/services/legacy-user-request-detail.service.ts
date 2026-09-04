import {
  MAX_RELATED_VSTS_ITEMS,
  normalizeLegacyWorkId,
  type LegacyRelatedVstsItemRow,
  type LegacyUserRequestDetailRow,
  type ReadOnlyLegacySqlConnector,
} from "@access-portal/connectors";
import type {
  LegacyLifecycleStage,
  LegacyRelatedVstsItem,
  LegacyStatusComparison,
  LegacyUserRequestDetail,
} from "@access-portal/contracts";

export type LegacyUserRequestDetailReader = Pick<
  ReadOnlyLegacySqlConnector,
  "findLegacyUserRequestDetail" | "listLegacyVstsItemsBySharepointId"
>;

export class LegacyUserRequestNotFoundError extends Error {
  readonly code = "legacy_user_request_not_found";
  readonly statusCode = 404;

  constructor() {
    super("The legacy User Request was not found.");
    this.name = "LegacyUserRequestNotFoundError";
  }
}

export class LegacyUserRequestDuplicateError extends Error {
  readonly code = "legacy_user_request_duplicate";
  readonly statusCode = 409;

  constructor() {
    super("The legacy User Request identifier is not unique.");
    this.name = "LegacyUserRequestDuplicateError";
  }
}

function normalizeSourceText(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function compareStatus(
  sharePointStatus: string | null,
  vstsState: string | null,
): LegacyStatusComparison {
  const source = normalizeSourceText(sharePointStatus)?.toLocaleLowerCase("en-US");
  const target = normalizeSourceText(vstsState)?.toLocaleLowerCase("en-US");
  if (!source || !target) return "UNKNOWN";
  return source === target ? "MATCH" : "MISMATCH";
}

function stage(
  code: LegacyLifecycleStage["code"],
  options: {
    readonly value?: string | null;
    readonly dateText?: string | null;
    readonly relatedItemCount?: number | null;
    readonly observed: boolean;
  },
): LegacyLifecycleStage {
  return {
    code,
    availability: options.observed ? "OBSERVED" : "UNAVAILABLE",
    value: options.value ?? null,
    dateText: options.dateText ?? null,
    relatedItemCount: options.relatedItemCount ?? null,
  };
}

function buildLifecycle(
  row: LegacyUserRequestDetailRow,
  relatedItems: readonly LegacyRelatedVstsItem[],
  workItemCount: number,
): readonly LegacyLifecycleStage[] {
  const createdDateText = normalizeSourceText(row.createdDateText);
  const updatedDateText = normalizeSourceText(row.updatedDateText);
  const lineManager = normalizeSourceText(row.lineManagerApprovalStatus);
  const ceo = normalizeSourceText(row.ceoApprovalStatus);
  const itManager = normalizeSourceText(row.itManagerApprovalStatus);
  const states = new Map<string, string>();
  for (const item of relatedItems) {
    const stateValue = normalizeSourceText(item.state);
    if (stateValue) {
      states.set(stateValue.toLocaleLowerCase("en-US"), stateValue);
    }
  }
  const singleState = states.size === 1 ? [...states.values()][0] ?? null : null;

  return [
    stage("REQUEST_CREATED", {
      observed: createdDateText !== null,
      dateText: createdDateText,
    }),
    stage("LINE_MANAGER_APPROVAL", {
      observed: lineManager !== null,
      value: lineManager,
    }),
    stage("CEO_APPROVAL", { observed: ceo !== null, value: ceo }),
    stage("IT_MANAGER_APPROVAL", {
      observed: itManager !== null,
      value: itManager,
    }),
    stage("VSTS_WORK_ITEM", {
      observed: workItemCount > 0,
      relatedItemCount: workItemCount,
    }),
    stage("VSTS_STATE", {
      observed: states.size > 0,
      value: singleState,
    }),
    stage("REQUEST_UPDATED", {
      observed: updatedDateText !== null,
      dateText: updatedDateText,
    }),
  ];
}

export function normalizeLegacyUserRequestDetail(
  idSharepoint: number,
  row: LegacyUserRequestDetailRow,
  vstsRows: readonly LegacyRelatedVstsItemRow[],
  sourceRowCount: number,
): LegacyUserRequestDetail {
  const vstsStatus = normalizeSourceText(row.vstsStatus);
  const relatedVstsItems = vstsRows.map<LegacyRelatedVstsItem>((item) => {
    const state = normalizeSourceText(item.state);
    return {
      workItemId: normalizeLegacyWorkId(item.workItemId),
      state,
      statusComparison: compareStatus(vstsStatus, state),
    };
  });
  const workItemCounts = new Map<string, number>();
  let nullWorkItemIdCount = 0;
  for (const item of relatedVstsItems) {
    if (!item.workItemId) {
      nullWorkItemIdCount += 1;
      continue;
    }
    workItemCounts.set(
      item.workItemId,
      (workItemCounts.get(item.workItemId) ?? 0) + 1,
    );
  }
  const truncated = sourceRowCount > relatedVstsItems.length;
  const comparisons = relatedVstsItems.map((item) => item.statusComparison);
  const statusComparison: LegacyStatusComparison = comparisons.includes("MISMATCH")
    ? "MISMATCH"
    : !truncated && comparisons.includes("MATCH")
      ? "MATCH"
      : "UNKNOWN";
  const workItemCount = workItemCounts.size;

  return {
    externalRequestId: String(idSharepoint),
    workItemId: normalizeLegacyWorkId(row.workItemId),
    company: normalizeSourceText(row.company),
    department: normalizeSourceText(row.department),
    country: normalizeSourceText(row.country),
    system: normalizeSourceText(row.system),
    permission: normalizeSourceText(row.permission),
    workflow: {
      lineManagerApprovalStatus: normalizeSourceText(
        row.lineManagerApprovalStatus,
      ),
      ceoApprovalStatus: normalizeSourceText(row.ceoApprovalStatus),
      itManagerApprovalStatus: normalizeSourceText(
        row.itManagerApprovalStatus,
      ),
      vstsStatus,
      openCaseStatus: normalizeSourceText(row.openCaseStatus),
      statusComparison,
    },
    createdDateText: normalizeSourceText(row.createdDateText),
    updatedDateText: normalizeSourceText(row.updatedDateText),
    relatedVstsItems,
    relationship: {
      sourceRowCount,
      returnedRowCount: relatedVstsItems.length,
      workItemCount,
      duplicateWorkItemIdCount: [...workItemCounts.values()].filter(
        (count) => count > 1,
      ).length,
      nullWorkItemIdCount,
      truncated,
    },
    lifecycle: buildLifecycle(row, relatedVstsItems, workItemCount),
  };
}

/** Live normalization only; this service has no Portal database dependency. */
export class LegacyUserRequestDetailService {
  constructor(private readonly legacySql: LegacyUserRequestDetailReader) {}

  async getDetail(idSharepoint: number): Promise<LegacyUserRequestDetail> {
    const requestRows = await this.legacySql.findLegacyUserRequestDetail(
      idSharepoint,
    );
    if (requestRows.length === 0) throw new LegacyUserRequestNotFoundError();
    if (requestRows.length !== 1) throw new LegacyUserRequestDuplicateError();
    const requestRow = requestRows[0];
    if (!requestRow) throw new LegacyUserRequestNotFoundError();

    const related = await this.legacySql.listLegacyVstsItemsBySharepointId(
      idSharepoint,
      MAX_RELATED_VSTS_ITEMS,
    );
    if (
      related.rows.length > MAX_RELATED_VSTS_ITEMS ||
      related.totalCount < related.rows.length
    ) {
      throw new Error("Legacy VSTS reader violated the bounded result contract.");
    }

    return normalizeLegacyUserRequestDetail(
      idSharepoint,
      requestRow,
      related.rows,
      related.totalCount,
    );
  }
}
