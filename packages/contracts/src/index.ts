export type LegacyIntegrationMode = "READ_ONLY";
export * from "./resolution-design.js";

export const portalRoles = ["Admin", "Approver", "Viewer"] as const;
export type PortalRole = (typeof portalRoles)[number];

export interface AuthenticatedIdentityResponse {
  readonly authenticated: true;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly PortalRole[];
}

export interface AdminTestResponse extends AuthenticatedIdentityResponse {
  readonly authorizedRole: "Admin";
}

export const legacyMatrixSources = ["NEW", "TH", "PH", "VN_MY_ID"] as const;
export type LegacyMatrixSource = (typeof legacyMatrixSources)[number];

export interface LegacyMatrixRow {
  readonly roleName: string | null;
  readonly department: string | null;
  readonly managerMasked: string | null;
  readonly active: string | null;
}

export interface LegacyMatrixRowsResponse {
  readonly source: LegacyMatrixSource;
  readonly rowsRead: number;
  readonly limit: number;
  readonly rows: readonly LegacyMatrixRow[];
}

export interface LegacyMatrixFieldQuality {
  readonly nullCount: number;
  readonly blankCount: number;
  readonly trailingWhitespaceCount: number;
  readonly inconsistentCapitalizationGroups: number;
}

export interface LegacyMatrixActivePattern {
  readonly value: string | null;
  readonly count: number;
}

export interface LegacyMatrixSummaryResponse {
  readonly source: LegacyMatrixSource;
  readonly sampleSize: number;
  readonly sampleLimit: number;
  readonly sampleDistinctRoleCount: number;
  readonly sampleDistinctDepartmentCount: number;
  readonly sampleDistinctManagerCount: number;
  readonly activePatterns: readonly LegacyMatrixActivePattern[];
  readonly quality: Readonly<
    Record<
      "roleName" | "manager" | "department" | "active",
      LegacyMatrixFieldQuality
    >
  >;
  readonly normalizedDuplicateRows: number;
  readonly normalizedDuplicateGroups: number;
  readonly roleNamesWithMultipleManagers: number;
  readonly roleNamesWithMultipleDepartments: number;
  readonly departmentRolePairsWithMultipleManagers: number;
}

export interface LegacyUserRequestSummary {
  readonly externalRequestId: string | null;
  readonly workItemId: string | null;
  readonly company: string | null;
  readonly department: string | null;
  readonly country: string | null;
  readonly system: string | null;
  readonly permission: string | null;
  readonly lineManagerApprovalStatus: string | null;
  readonly ceoApprovalStatus: string | null;
  readonly itManagerApprovalStatus: string | null;
  readonly vstsStatus: string | null;
  /**
   * Trimmed source text. The legacy column is varchar and is not guaranteed to
   * be ISO 8601 until its value vocabulary is separately validated.
   */
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
}

export interface LegacyUserRequestFilters {
  readonly system?: string;
  readonly country?: string;
  readonly vstsStatus?: string;
  readonly department?: string;
}

export interface LegacyUserRequestListResponse {
  readonly rowsRead: number;
  readonly limit: number;
  readonly requests: readonly LegacyUserRequestSummary[];
}

export type LegacyStatusComparison = "MATCH" | "MISMATCH" | "UNKNOWN";

export type LegacyLifecycleStageCode =
  | "REQUEST_CREATED"
  | "LINE_MANAGER_APPROVAL"
  | "CEO_APPROVAL"
  | "IT_MANAGER_APPROVAL"
  | "VSTS_WORK_ITEM"
  | "VSTS_STATE"
  | "REQUEST_UPDATED";

export type LegacyLifecycleAvailability = "OBSERVED" | "UNAVAILABLE";

export interface LegacyLifecycleStage {
  readonly code: LegacyLifecycleStageCode;
  readonly availability: LegacyLifecycleAvailability;
  /** Source status text only; no business meaning is inferred. */
  readonly value: string | null;
  /** Preserved legacy text because the SharePoint source column is varchar. */
  readonly dateText: string | null;
  /** Present only for the VSTS_WORK_ITEM stage. */
  readonly relatedItemCount: number | null;
}

export interface LegacyRelatedVstsItem {
  readonly workItemId: string | null;
  readonly state: string | null;
  readonly statusComparison: LegacyStatusComparison;
}

export interface LegacyUserRequestDetail {
  readonly externalRequestId: string;
  /** The passive Work_ID value observed on the SharePoint backup row. */
  readonly workItemId: string | null;
  readonly company: string | null;
  readonly department: string | null;
  readonly country: string | null;
  readonly system: string | null;
  readonly permission: string | null;
  readonly workflow: {
    readonly lineManagerApprovalStatus: string | null;
    readonly ceoApprovalStatus: string | null;
    readonly itManagerApprovalStatus: string | null;
    readonly vstsStatus: string | null;
    readonly openCaseStatus: string | null;
    readonly statusComparison: LegacyStatusComparison;
  };
  readonly createdDateText: string | null;
  readonly updatedDateText: string | null;
  readonly relatedVstsItems: readonly LegacyRelatedVstsItem[];
  readonly relationship: {
    /** Total VSTS backup rows for this request-origin reference. */
    readonly sourceRowCount: number;
    readonly returnedRowCount: number;
    readonly workItemCount: number;
    readonly duplicateWorkItemIdCount: number;
    readonly nullWorkItemIdCount: number;
    readonly truncated: boolean;
  };
  readonly lifecycle: readonly LegacyLifecycleStage[];
}

export interface PilotStatus {
  projectName: "Access Management Portal";
  phase: "LOCAL_SKELETON";
  legacyIntegrationMode: LegacyIntegrationMode;
}

export interface HealthResponse {
  status: "ok" | "configuration_error";
  service: "access-management-portal-api";
  legacyIntegrationMode: LegacyIntegrationMode | "BLOCKED";
}

export const portalRequestTypes = ["ADD", "REMOVE", "CHANGE"] as const;
export type PortalRequestType = (typeof portalRequestTypes)[number];

export interface PortalCatalogRole {
  readonly id: string;
  readonly systemId: string;
  readonly systemCode: string;
  readonly systemName: string;
  readonly applicationId: string | null;
  readonly applicationName: string | null;
  readonly contextId: string | null;
  readonly contextName: string | null;
  readonly code: string;
  readonly name: string;
}

export interface PortalRequestCatalogResponse {
  readonly roles: readonly PortalCatalogRole[];
}

export interface PortalAccessRequestSubmission {
  readonly requestType: PortalRequestType;
  readonly currentRoleId?: string;
  readonly requestedRoleId?: string;
  readonly reason: string;
  readonly effectiveDate?: string;
  readonly expirationDate?: string;
  readonly idempotencyKey: string;
}

export interface PortalAccessRequestItem {
  readonly action: PortalRequestType;
  readonly currentRole: PortalCatalogRole | null;
  readonly requestedRole: PortalCatalogRole | null;
  readonly status: "PENDING";
}

export interface PortalAccessRequest {
  readonly id: string;
  readonly requestNumber: string;
  readonly requestType: PortalRequestType;
  readonly reason: string;
  readonly status: "SUBMITTED";
  readonly version: number;
  readonly submittedAt: string;
  readonly effectiveDate: string | null;
  readonly expirationDate: string | null;
  readonly item: PortalAccessRequestItem;
}

export interface PortalAccessRequestListResponse {
  readonly requests: readonly PortalAccessRequest[];
}

export interface PortalAccessRequestSubmissionResponse {
  readonly request: PortalAccessRequest;
  readonly replayed: boolean;
}

/** Phase-1 contract. A future adapter may translate this to USR_PowerApp. */
export interface ProductManagementRequest {
  readonly id: string;
  readonly requestId: string;
  readonly system: "Product Management";
  readonly country: string;
  readonly topic: string;
  readonly requester: string;
  readonly createdDate: string;
  readonly status: "DRAFT" | "SUBMITTED";
  readonly workId: string | null;
  readonly fields: Readonly<Record<string, string>>;
}
export interface ProductManagementRequestListResponse { readonly source: "MOCK"; readonly requests: readonly ProductManagementRequest[]; }
export type ProductManagementDataSource = "MOCK" | "REAL";
export interface ProductManagementOption { readonly value: string; readonly label: string; }
export interface ProductManagementCountriesResponse { readonly source: ProductManagementDataSource; readonly countries: readonly ProductManagementOption[]; }
export interface ProductManagementTopicsResponse { readonly source: ProductManagementDataSource; readonly country: string; readonly topics: readonly ProductManagementOption[]; }
export type ProductManagementLookupName = "providerType" | "package" | "packageAddOn" | "appName" | "product" | "account" | "customerRole" | "internalRole";
export interface ProductManagementLookupContext { readonly country: string; readonly topic: string; readonly account?: string; }
export interface ProductManagementLookupResponse { readonly source: ProductManagementDataSource; readonly lookup: string; readonly options: readonly ProductManagementOption[]; }
export type ProductManagementSchemaImplementationStatus = "CONFIRMED" | "PARTIAL" | "UNKNOWN";
export type ProductManagementFieldRequiredness = "CONFIRMED_REQUIRED" | "CONFIRMED_OPTIONAL" | "CONDITIONAL" | "UNKNOWN";
export type ProductManagementFieldMultiplicity = "SINGLE" | "MULTIPLE" | "DELIMITED_TEXT" | "UNKNOWN";
export type ProductManagementPortalHandling = "DISPLAY" | "HIDE" | "AUTO_FILL" | "LOCK" | "ALLOW_EDIT";
export type ProductManagementSchemaPartialReason =
  | "UNKNOWN_REQUIREDNESS"
  | "UNKNOWN_MULTIPLICITY"
  | "UNKNOWN_SUBMISSION_MAPPING"
  | "UNKNOWN_VISIBILITY"
  | "UNKNOWN_LOOKUP_AUTHORITY"
  | "UNKNOWN_TEXT_LIST_FORMAT"
  | "UNAPPROVED_LEGACY_FIELD_REUSE"
  | "LEGACY_REQUIREDNESS_ANOMALY"
  | "DUPLICATE_LEGACY_ROUTE";
export interface ProductManagementFormField {
  readonly key: string;
  readonly label: string;
  readonly required: boolean;
  readonly type: "text" | "textarea" | "select";
  readonly options?: readonly string[];
  readonly lookup?: ProductManagementLookupName;
  readonly dependsOn?: readonly string[];
  readonly serverResolvedBy?: "AUTHENTICATED_USER_DEPARTMENT_OR_MANAGER";
  readonly legacyDataField?: string;
  readonly legacyLabel?: string;
  readonly legacyControl?: string;
  readonly legacyBinding?: string;
  readonly legacyDefault?: string;
  readonly legacyVisibility?: "VISIBLE" | "HIDDEN" | "CONDITIONAL" | "UNKNOWN";
  readonly legacyLookupSource?: string;
  readonly requiredness?: ProductManagementFieldRequiredness;
  readonly multiplicity?: ProductManagementFieldMultiplicity;
  readonly portalHandling?: ProductManagementPortalHandling;
  readonly submitDestination?: string;
  readonly transformation?: string;
}
export interface ProductManagementFormSchemaMetadata {
  readonly legacyScreenPattern: string;
  readonly legacyFormPattern: string;
  readonly lookupRequirements: readonly ProductManagementLookupName[];
  readonly implementationStatus: ProductManagementSchemaImplementationStatus;
  readonly partialReasons: readonly ProductManagementSchemaPartialReason[];
}
export interface ProductManagementFormDefinition { readonly source?: ProductManagementDataSource; readonly country: string; readonly topic: string; readonly schema: ProductManagementFormSchemaMetadata; readonly fields: readonly ProductManagementFormField[]; }
export interface ProductManagementRequestSubmission { readonly country: string; readonly topic: string; readonly fields: Readonly<Record<string, string>>; readonly idempotencyKey: string; }
export interface ProductManagementRequestSubmissionResponse { readonly source: "MOCK"; readonly request: ProductManagementRequest; readonly replayed: boolean; }

export interface LegacyAccessRecord {
  readonly externalId: string;
  readonly employeeId: string;
  readonly resourceName: string;
  readonly accessLevel: string;
  readonly observedAt: string;
}

export interface LegacyAccessQuery {
  readonly employeeId?: string;
  readonly resourceName?: string;
  readonly continuationToken?: string;
}

export interface ReadPage<T> {
  readonly items: readonly T[];
  readonly continuationToken?: string;
}
