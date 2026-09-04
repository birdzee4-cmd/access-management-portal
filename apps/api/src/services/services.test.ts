import assert from "node:assert/strict";
import test from "node:test";

import type {
  AccessRequestRepository,
  ApprovalRepository,
  AuditLogRepository,
  DepartmentRepository,
  ExternalReferenceRepository,
  RoleRepository,
  SystemRepository,
} from "@access-portal/database";
import type { LegacyCatalogReader } from "./legacy-catalog.service.js";

import { AccessRequestService } from "./access-request.service.js";
import { ApprovalService } from "./approval.service.js";
import { AuditService } from "./audit.service.js";
import { CatalogService } from "./catalog.service.js";
import { LegacyCatalogService } from "./legacy-catalog.service.js";

test("CatalogService delegates catalog queries to injected repositories", async () => {
  const calls: string[] = [];
  const departments: DepartmentRepository = {
    findById: async () => null,
    findByCode: async () => null,
    listActive: async () => {
      calls.push("departments");
      return [];
    },
  };
  const systems: SystemRepository = {
    findById: async () => null,
    findByCode: async () => null,
    listActive: async () => {
      calls.push("systems");
      return [];
    },
  };
  const roles: RoleRepository = {
    findById: async () => null,
    listActiveBySystem: async (systemId) => {
      calls.push(`roles:${systemId}`);
      return [];
    },
  };
  const service = new CatalogService({ departments, systems, roles });

  await service.listActiveDepartments();
  await service.listActiveSystems();
  await service.listActiveRolesForSystem("system-1");

  assert.deepEqual(calls, ["departments", "systems", "roles:system-1"]);
});

test("AccessRequestService keeps portal and external-reference reads behind repositories", async () => {
  const calls: string[] = [];
  const accessRequests: AccessRequestRepository = {
    findById: async () => null,
    findByRequestNumber: async (requestNumber) => {
      calls.push(`request:${requestNumber}`);
      return null;
    },
    listByTargetUser: async (targetUserId) => {
      calls.push(`target:${targetUserId}`);
      return [];
    },
  };
  const externalReferences: ExternalReferenceRepository = {
    listForEntity: async (entityType, entityId) => {
      calls.push(`external:${entityType}:${entityId}`);
      return [];
    },
    findByExternalIdentifier: async () => null,
  };
  const service = new AccessRequestService({ accessRequests, externalReferences });

  await service.findByRequestNumber("AR-DEMO-000001");
  await service.listForTargetUser("user-1");
  await service.listExternalReferences("request-1");

  assert.deepEqual(calls, [
    "request:AR-DEMO-000001",
    "target:user-1",
    "external:ACCESS_REQUEST:request-1",
  ]);
});

test("ApprovalService delegates pending and request queries", async () => {
  const calls: string[] = [];
  const approvals: ApprovalRepository = {
    listForRequest: async (requestId) => {
      calls.push(`request:${requestId}`);
      return [];
    },
    listPendingForApprover: async (approverId) => {
      calls.push(`approver:${approverId}`);
      return [];
    },
  };
  const service = new ApprovalService(approvals);

  await service.listForRequest("request-1");
  await service.listPendingForApprover("approver-1");

  assert.deepEqual(calls, ["request:request-1", "approver:approver-1"]);
});

test("AuditService uses the append-only repository method", async () => {
  const calls: string[] = [];
  const auditLogs: AuditLogRepository = {
    append: async (entry) => {
      calls.push(entry.action);
      return {
        id: "audit-1",
        occurredAt: new Date("2030-01-01T00:00:00.000Z"),
        actorId: null,
        actor: entry.actor,
        targetUserId: null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        systemId: null,
        beforeValue: null,
        afterValue: null,
        result: entry.result,
        connector: null,
        errorMessage: null,
        correlationId: null,
      };
    },
  };
  const service = new AuditService(auditLogs);

  await service.record({
    actor: "demo.requester@example.invalid",
    action: "ACCESS_REQUEST_CREATED",
    entityType: "ACCESS_REQUEST",
    entityId: "request-1",
    result: "SUCCESS",
  });

  assert.deepEqual(calls, ["ACCESS_REQUEST_CREATED"]);
});

test("LegacyCatalogService delegates only to the injected read-only connector", async () => {
  const calls: string[] = [];
  const reader: LegacyCatalogReader = {
    listProductManagementMatrix: async (source) => {
      calls.push(source);
      return [];
    },
  };
  const service = new LegacyCatalogService(reader);

  assert.deepEqual(await service.listProductManagementMatrix("TH"), []);
  assert.deepEqual(calls, ["TH"]);
});
