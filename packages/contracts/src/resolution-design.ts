/** DESIGN ONLY — NOT ACTIVE. No repository, API, identity lookup or execution port. */
export const resolutionStatuses = ["UNRESOLVED", "IN_REVIEW", "RESOLVED", "SUPERSEDED", "BLOCKED"] as const;
export type ResolutionStatus = (typeof resolutionStatuses)[number];
export const governanceStatuses = ["NOT_SUBMITTED", "PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
export type GovernanceStatus = (typeof governanceStatuses)[number];
export const activationStatuses = ["INACTIVE", "ACTIVE", "SUSPENDED"] as const;
export type ActivationStatus = (typeof activationStatuses)[number];
export type CandidateType = "CATALOG" | "APPROVAL_RULE";
export type ResolutionVersion = number;
export type SourceDriftStatus = "UNCHANGED" | "SOURCE_CHANGED" | "SOURCE_MISSING" | "SOURCE_COLLISION" | "UNKNOWN";

/** Immutable, issuer-scoped reference. No profile, display name or credential fields. */
export type ResolutionActorReference =
  | { readonly identityType: "PORTAL_USER"; readonly identityId: string; readonly portalContext: string }
  | { readonly identityType: "ENTRA_USER"; readonly identityId: string; readonly tenantContext: string };
export type ResolutionApproverReference = ResolutionActorReference |
  { readonly identityType: "ENTRA_GROUP"; readonly identityId: string; readonly tenantContext: string };

export interface CatalogEntityReference {
  readonly kind: "SYSTEM" | "APPLICATION" | "ROLE" | "PERMISSION" | "CONTEXT";
  readonly reference: string;
}
export type OptionalCatalogReference =
  | { readonly status: "UNRESOLVED" }
  | { readonly status: "NOT_APPLICABLE"; readonly reason: string }
  | { readonly status: "RESOLVED"; readonly target: CatalogEntityReference };

export interface CatalogResolutionPayload {
  readonly candidateType: "CATALOG";
  readonly schemaVersion: 1;
  readonly system: CatalogEntityReference & { readonly kind: "SYSTEM" };
  readonly role: CatalogEntityReference & { readonly kind: "ROLE" };
  readonly application: OptionalCatalogReference;
  readonly permission: OptionalCatalogReference;
  readonly context: OptionalCatalogReference;
}
export interface ResolutionDecisionReference {
  readonly recordId: string;
  readonly decisionId: string;
  readonly version: ResolutionVersion;
}
export type ApprovalDecisionMode =
  | { readonly mode: "UNKNOWN"; readonly sequence: readonly [] }
  | { readonly mode: "ANY" | "ALL"; readonly sequence: readonly [] }
  | { readonly mode: "SEQUENTIAL"; readonly sequence: readonly ResolutionApproverReference[] };
export interface ApprovalResolutionPayload {
  readonly candidateType: "APPROVAL_RULE";
  readonly schemaVersion: 1;
  readonly catalogResolution: ResolutionDecisionReference;
  readonly approvers: readonly ResolutionApproverReference[];
  readonly decisionMode: ApprovalDecisionMode;
  readonly scope: Readonly<Record<"role" | "department" | "source" | "context", "UNRESOLVED" | "IN_SCOPE" | "NOT_IN_SCOPE">>;
}
export type ResolutionPayload = CatalogResolutionPayload | ApprovalResolutionPayload;

export interface ResolutionSourceEvidence {
  readonly candidateType: CandidateType;
  readonly sourceScope: string;
  readonly candidateFingerprint: string;
  readonly sourceSnapshotHash: string;
  readonly hashAlgorithm: "SHA256";
  readonly normalizationVersion: string;
}
export type CurrentSourceEvidence =
  | { readonly state: "UNKNOWN" }
  | { readonly state: "MISSING"; readonly authoritativeLookup: boolean }
  | { readonly state: "FOUND"; readonly matches: readonly ResolutionSourceEvidence[] };

/** Aggregate revision, distinct from immutable decision version. */
export interface ConcurrencyToken {
  readonly recordId: string;
  readonly expectedVersion: number;
}
export interface ResolutionRecord {
  readonly id: string;
  readonly candidateType: CandidateType;
  readonly candidateFingerprint: string;
  readonly owner: ResolutionActorReference;
  readonly resolutionStatus: ResolutionStatus;
  readonly governanceStatus: GovernanceStatus;
  readonly activationStatus: ActivationStatus;
  readonly currentVersion: ResolutionVersion;
  readonly revision: number;
  readonly latestDecisionId: string | null;
  readonly approvedDecision: ResolutionDecisionReference | null;
  readonly activeDecision: ResolutionDecisionReference | null;
  readonly createdAt: string;
  readonly createdBy: ResolutionActorReference;
  readonly updatedAt: string;
  readonly updatedBy: ResolutionActorReference;
}
export interface ResolutionDecisionDraft {
  readonly recordId: string;
  readonly concurrency: ConcurrencyToken;
  readonly payload: ResolutionPayload;
  readonly decisionReason: string;
  readonly sourceEvidence: ResolutionSourceEvidence;
  readonly rollbackOf: ResolutionDecisionReference | null;
}
/** Immutable content. Reviews/approvals are separate append-only attestations. */
export interface ResolutionDecision {
  readonly id: string;
  readonly resolutionRecordId: string;
  readonly version: ResolutionVersion;
  readonly payload: ResolutionPayload;
  readonly decisionReason: string;
  readonly decisionStatus: "DRAFTED";
  readonly decidedBy: ResolutionActorReference;
  readonly decidedAt: string;
  readonly sourceEvidence: ResolutionSourceEvidence;
  readonly previousDecisionId: string | null;
  readonly rollbackOf: ResolutionDecisionReference | null;
}
export interface ResolutionGovernanceAttestation {
  readonly id: string;
  readonly decision: ResolutionDecisionReference;
  readonly outcome: "REVIEWED" | "APPROVED" | "REJECTED";
  readonly actor: ResolutionActorReference;
  readonly actorRole: "REVIEWED_BY" | "APPROVED_BY";
  readonly occurredAt: string;
  readonly reason: string;
  readonly policyVersion: string;
}
export const resolutionAuditEventTypes = ["RESOLUTION_CREATED", "DECISION_DRAFTED", "DECISION_REVIEWED",
  "DECISION_REJECTED", "DECISION_APPROVED", "RESOLUTION_ACTIVATED", "RESOLUTION_DEACTIVATED",
  "RESOLUTION_SUPERSEDED", "SOURCE_DRIFT_DETECTED"] as const;
export interface ResolutionAuditEvent {
  readonly eventId: string;
  readonly eventType: (typeof resolutionAuditEventTypes)[number];
  readonly recordId: string;
  readonly decision: ResolutionDecisionReference | null;
  readonly actor: ResolutionActorReference;
  readonly actorRole: "CREATED_BY" | "UPDATED_BY" | "DECIDED_BY" | "REVIEWED_BY" | "APPROVED_BY" | "ACTIVATED_BY";
  readonly occurredAt: string;
  readonly aggregateRevision: number;
  readonly previousEventId: string | null;
  readonly correlationId: string;
  readonly reason: string;
  readonly sourceSnapshotHash: string | null;
}

export type ResolutionValidation = { readonly valid: true } |
  { readonly valid: false; readonly code: string };
const valid: ResolutionValidation = { valid: true };
const invalid = (code: string): ResolutionValidation => ({ valid: false, code });
const positiveInteger = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const identifier = (value: unknown): value is string => typeof value === "string" && value.length <= 200 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
const sha256 = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function keys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).length === allowed.length && allowed.every((key) => Object.hasOwn(value, key));
}

/** Proposed bounded plain-text contract, not HTML parsing or a privacy filter. */
export const MAX_RESOLUTION_REASON_LENGTH = 2000;
export function validateResolutionReason(reason: unknown): ResolutionValidation {
  return typeof reason === "string" && reason.trim().length > 0 && reason.length <= MAX_RESOLUTION_REASON_LENGTH &&
    !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(reason) ? valid : invalid("INVALID_REASON");
}
function identity(value: unknown): value is ResolutionApproverReference {
  if (!object(value) || !identifier(value.identityId)) return false;
  if (value.identityType === "PORTAL_USER") return keys(value, ["identityType", "identityId", "portalContext"]) && identifier(value.portalContext);
  return ["ENTRA_USER", "ENTRA_GROUP"].includes(String(value.identityType)) &&
    keys(value, ["identityType", "identityId", "tenantContext"]) && identifier(value.tenantContext);
}
function identityKey(value: ResolutionApproverReference): string {
  return JSON.stringify([value.identityType, value.identityId, value.identityType === "PORTAL_USER" ? value.portalContext : value.tenantContext]);
}
function entity(value: unknown, kind: string): boolean {
  return object(value) && keys(value, ["kind", "reference"]) && value.kind === kind && identifier(value.reference);
}
function optionalEntity(value: unknown, kind: string): boolean {
  if (!object(value)) return false;
  if (value.status === "UNRESOLVED") return keys(value, ["status"]);
  if (value.status === "NOT_APPLICABLE") return keys(value, ["status", "reason"]) && validateResolutionReason(value.reason).valid;
  return value.status === "RESOLVED" && keys(value, ["status", "target"]) && entity(value.target, kind);
}
function decisionReference(value: unknown): value is ResolutionDecisionReference {
  return object(value) && keys(value, ["recordId", "decisionId", "version"]) && identifier(value.recordId) && identifier(value.decisionId) && positiveInteger(value.version);
}

/** Rejects unknown fields; structural validity does not verify identity or catalog ownership. */
export function validateResolutionPayload(payload: unknown): ResolutionValidation {
  if (!object(payload) || payload.schemaVersion !== 1) return invalid("INVALID_PAYLOAD");
  if (payload.candidateType === "CATALOG") {
    return keys(payload, ["candidateType", "schemaVersion", "system", "role", "application", "permission", "context"]) &&
      entity(payload.system, "SYSTEM") && entity(payload.role, "ROLE") && optionalEntity(payload.application, "APPLICATION") &&
      optionalEntity(payload.permission, "PERMISSION") && optionalEntity(payload.context, "CONTEXT") ? valid : invalid("INVALID_CATALOG_PAYLOAD");
  }
  if (payload.candidateType !== "APPROVAL_RULE" || !keys(payload, ["candidateType", "schemaVersion", "catalogResolution", "approvers", "decisionMode", "scope"]) ||
    !decisionReference(payload.catalogResolution) || !Array.isArray(payload.approvers) || !payload.approvers.length ||
    payload.approvers.length > 50 || !payload.approvers.every(identity)) return invalid("INVALID_APPROVAL_PAYLOAD");
  const approvers = payload.approvers as ResolutionApproverReference[];
  if (new Set(approvers.map(identityKey)).size !== approvers.length) return invalid("DUPLICATE_APPROVER_REFERENCE");
  const mode = payload.decisionMode;
  if (!object(mode) || !keys(mode, ["mode", "sequence"]) || !Array.isArray(mode.sequence)) return invalid("INVALID_DECISION_MODE");
  if (mode.mode === "SEQUENTIAL") {
    if (mode.sequence.length !== approvers.length || !mode.sequence.every(identity)) return invalid("INVALID_SEQUENCE");
    const sequence = mode.sequence as ResolutionApproverReference[];
    const known = new Set(approvers.map(identityKey));
    if (new Set(sequence.map(identityKey)).size !== known.size || !sequence.every((item) => known.has(identityKey(item)))) return invalid("INVALID_SEQUENCE");
  } else if (!["UNKNOWN", "ANY", "ALL"].includes(String(mode.mode)) || mode.sequence.length !== 0) return invalid("INVALID_DECISION_MODE");
  if (!object(payload.scope) || !keys(payload.scope, ["role", "department", "source", "context"]) ||
    !Object.values(payload.scope).every((value) => ["UNRESOLVED", "IN_SCOPE", "NOT_IN_SCOPE"].includes(String(value)))) return invalid("INVALID_SCOPE");
  return valid;
}

export function validateResolutionTransition(from: ResolutionStatus, to: ResolutionStatus): ResolutionValidation {
  const allowed: Readonly<Record<ResolutionStatus, readonly ResolutionStatus[]>> = {
    UNRESOLVED: ["IN_REVIEW", "BLOCKED"], IN_REVIEW: ["RESOLVED", "BLOCKED"],
    RESOLVED: ["IN_REVIEW", "BLOCKED", "SUPERSEDED"], BLOCKED: ["IN_REVIEW", "SUPERSEDED"], SUPERSEDED: [],
  };
  return Object.hasOwn(allowed, from) && allowed[from].includes(to) ? valid : invalid("INVALID_RESOLUTION_TRANSITION");
}
export function validateGovernanceTransition(from: GovernanceStatus, to: GovernanceStatus): ResolutionValidation {
  const allowed: Readonly<Record<GovernanceStatus, readonly GovernanceStatus[]>> = {
    NOT_SUBMITTED: ["PENDING_REVIEW"], PENDING_REVIEW: ["APPROVED", "REJECTED"], APPROVED: [], REJECTED: [],
  };
  return Object.hasOwn(allowed, from) && allowed[from].includes(to) ? valid : invalid("INVALID_GOVERNANCE_TRANSITION");
}

function sourceEvidence(value: unknown): value is ResolutionSourceEvidence {
  return object(value) && keys(value, ["candidateType", "sourceScope", "candidateFingerprint", "sourceSnapshotHash", "hashAlgorithm", "normalizationVersion"]) &&
    ["CATALOG", "APPROVAL_RULE"].includes(String(value.candidateType)) && identifier(value.sourceScope) && sha256(value.candidateFingerprint) &&
    sha256(value.sourceSnapshotHash) && value.hashAlgorithm === "SHA256" && identifier(value.normalizationVersion);
}
export function detectSourceDrift(baseline: ResolutionSourceEvidence, current: CurrentSourceEvidence): SourceDriftStatus {
  if (!sourceEvidence(baseline) || !object(current)) return "UNKNOWN";
  if (current.state === "MISSING") return current.authoritativeLookup === true ? "SOURCE_MISSING" : "UNKNOWN";
  if (current.state !== "FOUND" || !Array.isArray(current.matches)) return "UNKNOWN";
  if (current.matches.length > 1) return "SOURCE_COLLISION";
  const found = current.matches[0];
  if (!sourceEvidence(found)) return "UNKNOWN";
  if (found.hashAlgorithm !== baseline.hashAlgorithm || found.normalizationVersion !== baseline.normalizationVersion) return "UNKNOWN";
  return found.candidateType === baseline.candidateType && found.sourceScope === baseline.sourceScope &&
    found.candidateFingerprint === baseline.candidateFingerprint && found.sourceSnapshotHash === baseline.sourceSnapshotHash ? "UNCHANGED" : "SOURCE_CHANGED";
}

export function validateExpectedVersion(
  current: { readonly recordId: string; readonly revision: number }, token: ConcurrencyToken,
): ResolutionValidation {
  if (!identifier(current.recordId) || !identifier(token.recordId) || !positiveInteger(current.revision) || !positiveInteger(token.expectedVersion)) return invalid("INVALID_CONCURRENCY_TOKEN");
  return current.recordId === token.recordId && current.revision === token.expectedVersion ? valid : invalid("VERSION_CONFLICT");
}
export interface NextVersionMetadata {
  readonly version: ResolutionVersion;
  readonly revision: number;
  readonly previousDecisionId: string | null;
  readonly rollbackOf: ResolutionDecisionReference | null;
  readonly governanceStatus: "NOT_SUBMITTED";
  readonly activationStatus: "INACTIVE";
}
/** Constructs metadata only. Caller supplies history references; no record is saved or changed. */
export function createNextVersionMetadata(
  current: { readonly recordId: string; readonly currentVersion: number; readonly revision: number; readonly latestDecisionId: string | null },
  token: ConcurrencyToken,
  rollbackOf: ResolutionDecisionReference | null = null,
): { readonly valid: true; readonly metadata: NextVersionMetadata } | { readonly valid: false; readonly code: string } {
  const concurrency = validateExpectedVersion(current, token);
  if (!concurrency.valid) return concurrency;
  if (!Number.isSafeInteger(current.currentVersion) || current.currentVersion < 0 ||
    current.currentVersion >= Number.MAX_SAFE_INTEGER || current.revision >= Number.MAX_SAFE_INTEGER || current.currentVersion > current.revision ||
    (current.currentVersion === 0 ? current.latestDecisionId !== null : !identifier(current.latestDecisionId))) return { valid: false, code: "INVALID_VERSION_HISTORY" };
  if (rollbackOf !== null && (!decisionReference(rollbackOf) || rollbackOf.recordId !== current.recordId ||
    rollbackOf.version >= current.currentVersion || rollbackOf.decisionId === current.latestDecisionId)) return { valid: false, code: "INVALID_ROLLBACK_REFERENCE" };
  return { valid: true, metadata: { version: current.currentVersion + 1, revision: current.revision + 1,
    previousDecisionId: current.latestDecisionId, rollbackOf: rollbackOf === null ? null : { ...rollbackOf },
    governanceStatus: "NOT_SUBMITTED", activationStatus: "INACTIVE" } };
}

export interface ActivationEligibilityInput {
  readonly resolutionStatus: ResolutionStatus;
  readonly governanceStatus: GovernanceStatus;
  readonly activationStatus: ActivationStatus;
  readonly currentDecision: ResolutionDecisionReference;
  readonly approvedDecision: ResolutionDecisionReference | null;
  readonly sourceDrift: SourceDriftStatus;
  /** All facts must be established by future trusted authorization/validation, never a browser. */
  readonly policyChecks: "VERIFIED" | "POLICY_REQUIRED";
  readonly identityChecks: "VERIFIED" | "UNRESOLVED" | "INELIGIBLE";
  readonly blockers: readonly string[];
}
export function validateActivationEligibility(input: ActivationEligibilityInput): {
  readonly status: "NOT_ELIGIBLE" | "ELIGIBLE_FOR_EXPLICIT_ACTIVATION";
  readonly blockers: readonly string[];
} {
  const blockers: string[] = [];
  if (input.resolutionStatus !== "RESOLVED") blockers.push("RESOLUTION_NOT_RESOLVED");
  if (input.governanceStatus !== "APPROVED") blockers.push("GOVERNANCE_NOT_APPROVED");
  if (!["INACTIVE", "SUSPENDED"].includes(input.activationStatus)) blockers.push("INVALID_ACTIVATION_STATE");
  if (!decisionReference(input.currentDecision) || !decisionReference(input.approvedDecision) ||
    input.currentDecision.recordId !== input.approvedDecision.recordId || input.currentDecision.decisionId !== input.approvedDecision.decisionId ||
    input.currentDecision.version !== input.approvedDecision.version) blockers.push("APPROVAL_VERSION_MISMATCH");
  if (input.sourceDrift !== "UNCHANGED") blockers.push("SOURCE_NOT_VERIFIED_UNCHANGED");
  if (input.policyChecks !== "VERIFIED") blockers.push("POLICY_REQUIRED");
  if (input.identityChecks !== "VERIFIED") blockers.push("IDENTITY_NOT_VERIFIED");
  if (!Array.isArray(input.blockers) || input.blockers.length) blockers.push("UNRESOLVED_BLOCKERS");
  return { status: blockers.length ? "NOT_ELIGIBLE" : "ELIGIBLE_FOR_EXPLICIT_ACTIVATION", blockers };
}
