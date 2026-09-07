import {
  getPrismaClient,
  PrismaAccessRequestRepository,
  PrismaApprovalRepository,
  PrismaAuditLogRepository,
  PrismaDepartmentRepository,
  PrismaExternalReferenceRepository,
  PrismaPortalRequestRepository,
  PrismaRoleRepository,
  PrismaSystemRepository,
  PrismaUserRepository,
} from "@access-portal/database";

import {
  AccessRequestService,
  ApprovalService,
  AuditService,
  CatalogService,
  PortalRequestService,
} from "../services/index.js";

export function createApiDataLayer() {
  const database = getPrismaClient();
  const repositories = {
    users: new PrismaUserRepository(database),
    departments: new PrismaDepartmentRepository(database),
    systems: new PrismaSystemRepository(database),
    roles: new PrismaRoleRepository(database),
    accessRequests: new PrismaAccessRequestRepository(database),
    approvals: new PrismaApprovalRepository(database),
    externalReferences: new PrismaExternalReferenceRepository(database),
    portalRequests: new PrismaPortalRequestRepository(database),
    auditLogs: new PrismaAuditLogRepository(database),
  };

  return {
    repositories,
    services: {
      catalog: new CatalogService(repositories),
      accessRequests: new AccessRequestService(repositories),
      portalRequests: new PortalRequestService(repositories.portalRequests),
      approvals: new ApprovalService(repositories.approvals),
      audit: new AuditService(repositories.auditLogs),
    },
  };
}
