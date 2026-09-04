export type LegacyIntegrationMode = "READ_ONLY";

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

export interface LegacyUserRequestListResponse {
  readonly rowsRead: number;
  readonly limit: number;
  readonly requests: readonly LegacyUserRequestSummary[];
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
