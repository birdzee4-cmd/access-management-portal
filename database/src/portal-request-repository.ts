import type {
  PortalAccessRequest,
  PortalCatalogRole,
  PortalRequestType,
} from "@access-portal/contracts";
import { Prisma } from "../generated/client/index.js";
import type { PortalPrismaClient } from "./client.js";

const requestInclude = {
  items: {
    include: {
      system: true,
      role: { include: { system: true, application: true, context: true } },
      currentRole: { include: { system: true, application: true, context: true } },
    },
  },
} satisfies Prisma.AccessRequestInclude;

type RequestRecord = Prisma.AccessRequestGetPayload<{ include: typeof requestInclude }>;
type CatalogRecord = Prisma.RoleGetPayload<{
  include: { system: true; application: true; context: true };
}>;

export interface PortalRequestActor {
  readonly id: string;
  readonly entraObjectId: string;
  readonly active: boolean;
}

export interface PortalRequestWrite {
  readonly id: string;
  readonly requestNumber: string;
  readonly requesterId: string;
  readonly requestType: PortalRequestType;
  readonly reason: string;
  readonly effectiveDate: Date | null;
  readonly expirationDate: Date | null;
  readonly idempotencyKey: string;
  readonly payloadHash: string;
  readonly currentRoleId: string | null;
  readonly requestedRoleId: string | null;
  readonly submittedAt: Date;
}

export interface PortalRequestWriteResult {
  readonly request: PortalAccessRequest;
  readonly replayed: boolean;
}

export class PortalRequestPersistenceError extends Error {
  constructor(readonly code: "IDEMPOTENCY_CONFLICT" | "CATALOG_UNAVAILABLE") {
    super(code);
    this.name = "PortalRequestPersistenceError";
  }
}

export interface PortalRequestRepository {
  findActorByEntraObjectId(entraObjectId: string): Promise<PortalRequestActor | null>;
  listActiveCatalogRoles(): Promise<readonly PortalCatalogRole[]>;
  findActiveCatalogRole(id: string): Promise<PortalCatalogRole | null>;
  submit(input: PortalRequestWrite): Promise<PortalRequestWriteResult>;
  listForRequester(requesterId: string): Promise<readonly PortalAccessRequest[]>;
  findForRequester(id: string, requesterId: string): Promise<PortalAccessRequest | null>;
}

function mapRole(role: CatalogRecord): PortalCatalogRole {
  return {
    id: role.id,
    systemId: role.systemId,
    systemCode: role.system.code,
    systemName: role.system.name,
    applicationId: role.applicationId,
    applicationName: role.application?.name ?? null,
    contextId: role.contextId,
    contextName: role.context?.name ?? null,
    code: role.code,
    name: role.name,
  };
}

function mapRequest(row: RequestRecord): PortalAccessRequest {
  const item = row.items[0];
  if (!item || row.items.length !== 1) {
    throw new Error("M1 requests must contain exactly one item.");
  }
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    requestType: row.requestType as PortalRequestType,
    reason: row.reason,
    status: "SUBMITTED",
    version: row.version,
    submittedAt: row.submittedAt.toISOString(),
    effectiveDate: row.effectiveDate?.toISOString().slice(0, 10) ?? null,
    expirationDate: row.expirationDate?.toISOString().slice(0, 10) ?? null,
    item: {
      action: item.action as PortalRequestType,
      currentRole: item.currentRole ? mapRole(item.currentRole) : null,
      requestedRole: item.role ? mapRole(item.role) : null,
      status: "PENDING",
    },
  };
}

export class PrismaPortalRequestRepository implements PortalRequestRepository {
  constructor(private readonly database: PortalPrismaClient) {}

  async findActorByEntraObjectId(entraObjectId: string): Promise<PortalRequestActor | null> {
    return this.database.user.findUnique({
      where: { entraObjectId },
      select: { id: true, entraObjectId: true, active: true },
    });
  }

  async listActiveCatalogRoles(): Promise<readonly PortalCatalogRole[]> {
    const roles = await this.database.role.findMany({
      where: { active: true, system: { active: true } },
      include: { system: true, application: true, context: true },
      orderBy: [{ system: { name: "asc" } }, { name: "asc" }],
    });
    return roles
      .filter((role) => (!role.application || role.application.active) && (!role.context || role.context.active))
      .map(mapRole);
  }

  async findActiveCatalogRole(id: string): Promise<PortalCatalogRole | null> {
    const role = await this.database.role.findFirst({
      where: { id, active: true, system: { active: true } },
      include: { system: true, application: true, context: true },
    });
    if (!role || role.application?.active === false || role.context?.active === false) return null;
    return mapRole(role);
  }

  async submit(input: PortalRequestWrite): Promise<PortalRequestWriteResult> {
    const existing = await this.database.accessRequest.findUnique({
      where: { requesterId_idempotencyKey: { requesterId: input.requesterId, idempotencyKey: input.idempotencyKey } },
      include: requestInclude,
    });
    if (existing) {
      if (existing.payloadHash !== input.payloadHash) throw new PortalRequestPersistenceError("IDEMPOTENCY_CONFLICT");
      return { request: mapRequest(existing), replayed: true };
    }

    try {
      const created = await this.database.$transaction(async (transaction) => {
        const roleIds = [input.currentRoleId, input.requestedRoleId].filter((value): value is string => Boolean(value));
        const activeRoles = await transaction.role.count({
          where: {
            id: { in: roleIds }, active: true, system: { active: true },
            AND: [{ OR: [{ applicationId: null }, { application: { active: true } }] }, { OR: [{ contextId: null }, { context: { active: true } }] }],
          },
        });
        if (activeRoles !== new Set(roleIds).size) throw new PortalRequestPersistenceError("CATALOG_UNAVAILABLE");

        const roleRows = await transaction.role.findMany({
          where: { id: { in: roleIds } }, include: { system: true, application: true, context: true },
        });
        const snapshot = JSON.stringify(roleRows.map(mapRole));
        const systemId = roleRows.find((role) => role.id === (input.requestedRoleId ?? input.currentRoleId))?.systemId;
        if (!systemId) throw new PortalRequestPersistenceError("CATALOG_UNAVAILABLE");

        const request = await transaction.accessRequest.create({
          data: {
            id: input.id, requestNumber: input.requestNumber,
            requesterId: input.requesterId, targetUserId: input.requesterId,
            requestType: input.requestType, reason: input.reason,
            effectiveDate: input.effectiveDate, expirationDate: input.expirationDate,
            status: "SUBMITTED", version: 1, idempotencyKey: input.idempotencyKey,
            payloadHash: input.payloadHash, submittedAt: input.submittedAt,
            metadata: JSON.stringify({ schemaVersion: 1, scope: "SELF_SERVICE" }),
            items: { create: {
              systemId, roleId: input.requestedRoleId, currentRoleId: input.currentRoleId,
              action: input.requestType, currentValue: input.currentRoleId,
              requestedValue: input.requestedRoleId, catalogSnapshot: snapshot, status: "PENDING",
            } },
          },
          include: requestInclude,
        });
        await transaction.auditLog.create({ data: {
          actorId: input.requesterId, actor: `PORTAL_USER:${input.requesterId}`,
          targetUserId: input.requesterId, action: "ACCESS_REQUEST_SUBMITTED",
          entityType: "ACCESS_REQUEST", entityId: input.id, systemId,
          afterValue: JSON.stringify({ requestType: input.requestType, status: "SUBMITTED", version: 1 }),
          result: "SUCCESS", correlationId: input.idempotencyKey,
        } });
        return request;
      });
      return { request: mapRequest(created), replayed: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const replay = await this.database.accessRequest.findUnique({
          where: { requesterId_idempotencyKey: { requesterId: input.requesterId, idempotencyKey: input.idempotencyKey } },
          include: requestInclude,
        });
        if (replay && replay.payloadHash === input.payloadHash) return { request: mapRequest(replay), replayed: true };
        throw new PortalRequestPersistenceError("IDEMPOTENCY_CONFLICT");
      }
      throw error;
    }
  }

  async listForRequester(requesterId: string): Promise<readonly PortalAccessRequest[]> {
    const rows = await this.database.accessRequest.findMany({
      where: { requesterId }, include: requestInclude, orderBy: { submittedAt: "desc" }, take: 100,
    });
    return rows.map(mapRequest);
  }

  async findForRequester(id: string, requesterId: string): Promise<PortalAccessRequest | null> {
    const row = await this.database.accessRequest.findFirst({ where: { id, requesterId }, include: requestInclude });
    return row ? mapRequest(row) : null;
  }
}
