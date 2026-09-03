import {
  getPrismaClient,
  PrismaAccessRequestRepository,
  PrismaApprovalRepository,
  PrismaAuditLogRepository,
  PrismaDepartmentRepository,
  PrismaExternalReferenceRepository,
  PrismaRoleRepository,
  PrismaSystemRepository,
  PrismaUserRepository,
} from "@access-portal/database";

import {
  AccessRequestService,
  ApprovalService,
  AuditService,
  CatalogService,
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
    auditLogs: new PrismaAuditLogRepository(database),
  };

  return {
    repositories,
    services: {
      catalog: new CatalogService(repositories),
      accessRequests: new AccessRequestService(repositories),
      approvals: new ApprovalService(repositories.approvals),
      audit: new AuditService(repositories.auditLogs),
    },
  };
}
