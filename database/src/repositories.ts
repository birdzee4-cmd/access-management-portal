import type {
  AccessRequest,
  Approval,
  AuditLog,
  Department,
  ExternalReference,
  Role,
  System as PortalSystem,
  User,
} from "../generated/client/index.js";

import type { PortalPrismaClient } from "./client.js";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmployeeId(employeeId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export interface DepartmentRepository {
  findById(id: string): Promise<Department | null>;
  findByCode(code: string): Promise<Department | null>;
  listActive(): Promise<Department[]>;
}

export interface SystemRepository {
  findById(id: string): Promise<PortalSystem | null>;
  findByCode(code: string): Promise<PortalSystem | null>;
  listActive(): Promise<PortalSystem[]>;
}

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  listActiveBySystem(systemId: string): Promise<Role[]>;
}

export interface AccessRequestRepository {
  findById(id: string): Promise<AccessRequest | null>;
  findByRequestNumber(requestNumber: string): Promise<AccessRequest | null>;
  listByTargetUser(targetUserId: string): Promise<AccessRequest[]>;
}

export interface ApprovalRepository {
  listForRequest(accessRequestId: string): Promise<Approval[]>;
  listPendingForApprover(approverId: string): Promise<Approval[]>;
}

export interface ExternalReferenceRepository {
  listForEntity(entityType: string, entityId: string): Promise<ExternalReference[]>;
  findByExternalIdentifier(
    externalSystem: string,
    externalScope: string,
    externalId: string,
  ): Promise<ExternalReference | null>;
}

export interface AuditLogAppendInput {
  readonly occurredAt?: Date;
  readonly actorId?: string | null;
  readonly actor: string;
  readonly targetUserId?: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly systemId?: string | null;
  readonly beforeValue?: string | null;
  readonly afterValue?: string | null;
  readonly result: string;
  readonly connector?: string | null;
  readonly errorMessage?: string | null;
  readonly correlationId?: string | null;
}

export interface AuditLogRepository {
  append(entry: AuditLogAppendInput): Promise<AuditLog>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  findById(id: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { id } });
  }

  findByEmployeeId(employeeId: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { employeeId } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.database.user.findUnique({ where: { email } });
  }
}

export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  findById(id: string): Promise<Department | null> {
    return this.database.department.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<Department | null> {
    return this.database.department.findUnique({ where: { code } });
  }

  listActive(): Promise<Department[]> {
    return this.database.department.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
}

export class PrismaSystemRepository implements SystemRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  findById(id: string): Promise<PortalSystem | null> {
    return this.database.system.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<PortalSystem | null> {
    return this.database.system.findUnique({ where: { code } });
  }

  listActive(): Promise<PortalSystem[]> {
    return this.database.system.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }
}

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  findById(id: string): Promise<Role | null> {
    return this.database.role.findUnique({ where: { id } });
  }

  listActiveBySystem(systemId: string): Promise<Role[]> {
    return this.database.role.findMany({
      where: { systemId, active: true },
      orderBy: { name: "asc" },
    });
  }
}

export class PrismaAccessRequestRepository implements AccessRequestRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  findById(id: string): Promise<AccessRequest | null> {
    return this.database.accessRequest.findUnique({ where: { id } });
  }

  findByRequestNumber(requestNumber: string): Promise<AccessRequest | null> {
    return this.database.accessRequest.findUnique({ where: { requestNumber } });
  }

  listByTargetUser(targetUserId: string): Promise<AccessRequest[]> {
    return this.database.accessRequest.findMany({
      where: { targetUserId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export class PrismaApprovalRepository implements ApprovalRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  listForRequest(accessRequestId: string): Promise<Approval[]> {
    return this.database.approval.findMany({
      where: { accessRequestId },
      orderBy: { approvalLevel: "asc" },
    });
  }

  listPendingForApprover(approverId: string): Promise<Approval[]> {
    return this.database.approval.findMany({
      where: { approverId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
  }
}

export class PrismaExternalReferenceRepository implements ExternalReferenceRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  listForEntity(entityType: string, entityId: string): Promise<ExternalReference[]> {
    return this.database.externalReference.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "asc" },
    });
  }

  findByExternalIdentifier(
    externalSystem: string,
    externalScope: string,
    externalId: string,
  ): Promise<ExternalReference | null> {
    return this.database.externalReference.findUnique({
      where: {
        externalSystem_externalScope_externalId: {
          externalSystem,
          externalScope,
          externalId,
        },
      },
    });
  }
}

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  append(entry: AuditLogAppendInput): Promise<AuditLog> {
    return this.database.auditLog.create({ data: { ...entry } });
  }
}
