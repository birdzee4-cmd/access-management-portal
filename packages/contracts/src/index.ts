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
