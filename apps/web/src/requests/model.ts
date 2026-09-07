import type { PortalAccessRequestSubmission, PortalCatalogRole, PortalRequestType } from "@access-portal/contracts";

export interface RequestDraft {
  readonly requestType: PortalRequestType;
  readonly currentRoleId: string;
  readonly requestedRoleId: string;
  readonly reason: string;
  readonly effectiveDate: string;
  readonly expirationDate: string;
}
export const emptyRequestDraft: RequestDraft = { requestType: "ADD", currentRoleId: "", requestedRoleId: "", reason: "", effectiveDate: "", expirationDate: "" };
export function validateDraft(draft: RequestDraft, roles: readonly PortalCatalogRole[]): readonly string[] {
  const errors: string[] = [], ids = new Set(roles.map(({ id }) => id));
  if (draft.reason.trim().length < 10 || draft.reason.trim().length > 1000) errors.push("Reason must contain 10–1000 characters.");
  if (draft.requestType === "ADD" && !ids.has(draft.requestedRoleId)) errors.push("Choose the requested role.");
  if (draft.requestType === "REMOVE" && !ids.has(draft.currentRoleId)) errors.push("Choose the current role to remove.");
  if (draft.requestType === "CHANGE") {
    const current = roles.find(({ id }) => id === draft.currentRoleId), requested = roles.find(({ id }) => id === draft.requestedRoleId);
    if (!current || !requested) errors.push("Choose both current and requested roles.");
    else if (current.id === requested.id) errors.push("Current and requested roles must differ.");
    else if (current.systemId !== requested.systemId) errors.push("A change must stay within one Portal system.");
  }
  if (draft.effectiveDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.effectiveDate)) errors.push("Effective date is invalid.");
  if (draft.expirationDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.expirationDate)) errors.push("Expiration date is invalid.");
  if (draft.effectiveDate && draft.expirationDate && draft.expirationDate < draft.effectiveDate) errors.push("Expiration date cannot precede effective date.");
  return errors;
}
export function toSubmission(draft: RequestDraft, idempotencyKey: string): PortalAccessRequestSubmission {
  return { requestType: draft.requestType, reason: draft.reason.trim(), idempotencyKey,
    ...(draft.currentRoleId ? { currentRoleId: draft.currentRoleId } : {}),
    ...(draft.requestedRoleId ? { requestedRoleId: draft.requestedRoleId } : {}),
    ...(draft.effectiveDate ? { effectiveDate: draft.effectiveDate } : {}),
    ...(draft.expirationDate ? { expirationDate: draft.expirationDate } : {}) };
}
