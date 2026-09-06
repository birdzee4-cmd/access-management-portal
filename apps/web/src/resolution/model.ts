/** Frontend preview contract only. Codes identify bundled synthetic options, not DB entities. */
export const catalogFields = ["system", "application", "role", "permission", "context"] as const;
export type CatalogField = (typeof catalogFields)[number];
export const scopeFields = ["Role", "Department", "Source", "Context"] as const;
export type ScopeField = (typeof scopeFields)[number];
export type ScopeDecision = "UNRESOLVED" | "IN_SCOPE" | "NOT_IN_SCOPE";
export type ReviewStatus = "UNREVIEWED" | "IN_REVIEW" | "RESOLVED_FOR_PREVIEW" | "BLOCKED";
export type PreviewReadiness = "NOT_READY" | "READY_FOR_REVIEW" | "RESOLVED_FOR_PREVIEW";
export type IdentityResolution = "UNRESOLVED" | "PORTAL_USER" | "ENTRA_USER" | "ENTRA_GROUP" | "UNKNOWN";
export type ApprovalMode = "UNKNOWN" | "ANY" | "ALL" | "SEQUENTIAL";

export interface SyntheticResolutionCandidate {
  readonly candidateId: string;
  readonly label: string;
  readonly scenario: string;
  readonly dataSource: "SYNTHETIC";
  readonly legacySource: "NEW" | "TH" | "PH" | "VN_MY_ID";
  readonly observedRole: string;
  readonly observedDepartments: readonly string[];
  readonly observedActive: string;
  readonly approvers: readonly { code: string; label: string }[];
  readonly catalogCollision: boolean;
  readonly catalogLinkAmbiguous: boolean;
  readonly warnings: readonly string[];
}

export interface ResolutionDraft {
  readonly candidateId: string;
  readonly catalog: Readonly<Record<CatalogField, string>>;
  readonly approval: {
    readonly authoritativeApproverDecision: "UNRESOLVED" | "YES" | "NO";
    readonly approverIdentityResolution: IdentityResolution;
    readonly approvalMode: ApprovalMode;
    readonly sequenceResolution: "UNRESOLVED" | "EXPLICIT_SYNTHETIC";
    readonly sequence: readonly string[];
    readonly scopeResolution: Readonly<Record<ScopeField, ScopeDecision>>;
  };
  readonly reviewStatus: ReviewStatus;
}

export interface PreviewBlocker { readonly code: string; readonly message: string }
export interface PreviewValidation {
  readonly blockers: readonly PreviewBlocker[];
  readonly warnings: readonly string[];
  readonly readiness: PreviewReadiness;
}

export const catalogOptions: Readonly<Record<CatalogField, readonly string[]>> = {
  system: ["SYS-DEMO"], application: ["APP-DEMO"],
  role: ["ROLE-DEMO-001", "ROLE-DEMO-002"], permission: ["PERMISSION-DEMO-READ"],
  context: ["CONTEXT-DEMO-ALPHA"],
};

export function createResolutionDraft(candidateId: string): ResolutionDraft {
  return { candidateId, catalog: { system: "UNRESOLVED", application: "UNRESOLVED",
    role: "UNRESOLVED", permission: "UNRESOLVED", context: "UNRESOLVED" },
    approval: { authoritativeApproverDecision: "UNRESOLVED", approverIdentityResolution: "UNRESOLVED",
      approvalMode: "UNKNOWN", sequenceResolution: "UNRESOLVED", sequence: [],
      scopeResolution: { Role: "UNRESOLVED", Department: "UNRESOLVED", Source: "UNRESOLVED", Context: "UNRESOLVED" } },
    reviewStatus: "UNREVIEWED" };
}

export function validateResolutionDraft(candidate: SyntheticResolutionCandidate, draft: ResolutionDraft): PreviewValidation {
  const blockers: PreviewBlocker[] = [];
  const add = (code: string, message: string) => blockers.push({ code, message });
  if (draft.candidateId !== candidate.candidateId || candidate.dataSource !== "SYNTHETIC") add("INVALID_CANDIDATE", "Select a bundled synthetic candidate.");
  for (const field of catalogFields) if (!catalogOptions[field].includes(draft.catalog[field])) {
    add("CATALOG_" + field.toUpperCase(), `${field === "context" ? "Access context" : field[0]!.toUpperCase() + field.slice(1)} needs an explicit synthetic selection.`);
  }
  const a = draft.approval;
  if (a.authoritativeApproverDecision !== "YES") add("AUTHORITY", a.authoritativeApproverDecision === "NO"
    ? "Approver authority is marked NO. This candidate remains blocked for preview."
    : "Approver authority remains unresolved.");
  if (!["PORTAL_USER", "ENTRA_USER", "ENTRA_GROUP"].includes(a.approverIdentityResolution)) add("IDENTITY", "Select a synthetic identity type; no identity lookup will occur.");
  if (!["ANY", "ALL", "SEQUENTIAL"].includes(a.approvalMode)) add("MODE", "Approval mode remains UNKNOWN.");
  const codes = candidate.approvers.map((person) => person.code);
  if (!codes.length) add("NO_APPROVERS", "No synthetic approver observations are available.");
  if (a.approvalMode === "SEQUENTIAL" && (a.sequenceResolution !== "EXPLICIT_SYNTHETIC" ||
    a.sequence.length !== codes.length || new Set(a.sequence).size !== codes.length ||
    !a.sequence.every((code) => codes.includes(code)))) add("SEQUENCE", "Choose each synthetic approver exactly once in the explicit sequence.");
  if (a.approvalMode !== "SEQUENTIAL" && (a.sequence.length || a.sequenceResolution !== "UNRESOLVED")) add("STALE_SEQUENCE", "Sequence must remain unresolved outside SEQUENTIAL mode.");
  for (const field of scopeFields) if (!["IN_SCOPE", "NOT_IN_SCOPE"].includes(a.scopeResolution[field])) add("SCOPE_" + field.toUpperCase(), `${field} approval scope remains unresolved.`);
  if (!scopeFields.some((field) => a.scopeResolution[field] === "IN_SCOPE")) add("EMPTY_SCOPE", "Explicitly include at least one scope dimension for this preview.");
  if (candidate.catalogCollision) add("CATALOG_COLLISION", "Catalog code collision requires a separate business decision; preview selections cannot clear it.");
  if (candidate.catalogLinkAmbiguous) add("CATALOG_LINK", "Catalog linkage is ambiguous; this preview cannot choose a catalog observation for you.");
  return { blockers, warnings: [...candidate.warnings, "Draft completeness has no production meaning."],
    readiness: blockers.length ? "NOT_READY" : draft.reviewStatus === "RESOLVED_FOR_PREVIEW" ? "RESOLVED_FOR_PREVIEW" : "READY_FOR_REVIEW" };
}

export type DraftAction =
  | { type: "catalog"; field: CatalogField; value: string }
  | { type: "authority"; value: ResolutionDraft["approval"]["authoritativeApproverDecision"] }
  | { type: "identity"; value: IdentityResolution }
  | { type: "mode"; value: ApprovalMode }
  | { type: "sequence"; position: number; value: string }
  | { type: "scope"; field: ScopeField; value: ScopeDecision }
  | { type: "validate" } | { type: "reset" };

export function updateResolutionDraft(candidate: SyntheticResolutionCandidate, draft: ResolutionDraft, action: DraftAction): ResolutionDraft {
  if (action.type === "reset") return createResolutionDraft(candidate.candidateId);
  if (action.type === "validate") return { ...draft,
    reviewStatus: validateResolutionDraft(candidate, draft).blockers.length ? "BLOCKED" : "RESOLVED_FOR_PREVIEW" };
  let next: ResolutionDraft = { ...draft, reviewStatus: "IN_REVIEW" };
  switch (action.type) {
    case "catalog": next = { ...next, catalog: { ...draft.catalog, [action.field]: action.value } }; break;
    case "authority": next = { ...next, approval: { ...draft.approval, authoritativeApproverDecision: action.value } }; break;
    case "identity": next = { ...next, approval: { ...draft.approval, approverIdentityResolution: action.value } }; break;
    case "mode": next = { ...next, approval: { ...draft.approval, approvalMode: action.value, sequence: [], sequenceResolution: "UNRESOLVED" } }; break;
    case "scope": next = { ...next, approval: { ...draft.approval, scopeResolution: { ...draft.approval.scopeResolution, [action.field]: action.value } } }; break;
    case "sequence": {
      if (draft.approval.approvalMode !== "SEQUENTIAL" || !Number.isInteger(action.position) || action.position < 0 || action.position >= candidate.approvers.length) return draft;
      const sequence = candidate.approvers.map((_, i) => draft.approval.sequence[i] ?? "");
      sequence[action.position] = action.value;
      next = { ...next, approval: { ...draft.approval, sequence, sequenceResolution: "EXPLICIT_SYNTHETIC" } };
    }
  }
  return next;
}
