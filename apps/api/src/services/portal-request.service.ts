import { createHash, randomUUID } from "node:crypto";
import type { PortalAccessRequestSubmission, PortalRequestCatalogResponse } from "@access-portal/contracts";
import type { PortalRequestActor, PortalRequestRepository } from "@access-portal/database";
import type { AuthenticatedUser } from "../auth/index.js";

export type PortalRequestErrorCode = "PORTAL_USER_NOT_FOUND" | "PORTAL_USER_INACTIVE" |
  "INVALID_REQUEST" | "CATALOG_UNAVAILABLE" | "IDEMPOTENCY_CONFLICT" | "REQUEST_NOT_FOUND";

export class PortalRequestError extends Error {
  constructor(readonly code: PortalRequestErrorCode, readonly statusCode: number) {
    super(code); this.name = "PortalRequestError";
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(value: string | undefined): Date | null {
  if (value === undefined) return null;
  if (!dateOnly.test(value)) throw new PortalRequestError("INVALID_REQUEST", 400);
  const parsed = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new PortalRequestError("INVALID_REQUEST", 400);
  return parsed;
}

function normalize(input: PortalAccessRequestSubmission) {
  if (!(["ADD", "REMOVE", "CHANGE"] as readonly unknown[]).includes(input.requestType)) throw new PortalRequestError("INVALID_REQUEST", 400);
  const reason = input.reason?.trim();
  if (!reason || reason.length < 10 || reason.length > 1000 || /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(reason)) throw new PortalRequestError("INVALID_REQUEST", 400);
  if (!uuid.test(input.idempotencyKey)) throw new PortalRequestError("INVALID_REQUEST", 400);
  const currentRoleId = input.currentRoleId?.trim() || null;
  const requestedRoleId = input.requestedRoleId?.trim() || null;
  if ((currentRoleId && !uuid.test(currentRoleId)) || (requestedRoleId && !uuid.test(requestedRoleId))) throw new PortalRequestError("INVALID_REQUEST", 400);
  if ((input.requestType === "ADD" && (!requestedRoleId || currentRoleId)) ||
    (input.requestType === "REMOVE" && (!currentRoleId || requestedRoleId)) ||
    (input.requestType === "CHANGE" && (!currentRoleId || !requestedRoleId || currentRoleId === requestedRoleId))) throw new PortalRequestError("INVALID_REQUEST", 400);
  const effectiveDate = parseDate(input.effectiveDate), expirationDate = parseDate(input.expirationDate);
  if (effectiveDate && expirationDate && expirationDate < effectiveDate) throw new PortalRequestError("INVALID_REQUEST", 400);
  return { requestType: input.requestType, reason, currentRoleId, requestedRoleId, effectiveDate,
    expirationDate, idempotencyKey: input.idempotencyKey.toLowerCase() };
}

export class PortalRequestService {
  constructor(private readonly repository: PortalRequestRepository) {}
  private async actor(identity: AuthenticatedUser): Promise<PortalRequestActor> {
    const actor = await this.repository.findActorByEntraObjectId(identity.entraObjectId);
    if (!actor) throw new PortalRequestError("PORTAL_USER_NOT_FOUND", 403);
    if (!actor.active) throw new PortalRequestError("PORTAL_USER_INACTIVE", 403);
    return actor;
  }
  async catalog(identity: AuthenticatedUser): Promise<PortalRequestCatalogResponse> {
    await this.actor(identity); return { roles: await this.repository.listActiveCatalogRoles() };
  }
  async submit(identity: AuthenticatedUser, input: PortalAccessRequestSubmission) {
    const actor = await this.actor(identity), value = normalize(input);
    const [currentRole, requestedRole] = await Promise.all([
      value.currentRoleId ? this.repository.findActiveCatalogRole(value.currentRoleId) : null,
      value.requestedRoleId ? this.repository.findActiveCatalogRole(value.requestedRoleId) : null,
    ]);
    if ((value.currentRoleId && !currentRole) || (value.requestedRoleId && !requestedRole)) throw new PortalRequestError("CATALOG_UNAVAILABLE", 409);
    if (currentRole && requestedRole && currentRole.systemId !== requestedRole.systemId) throw new PortalRequestError("INVALID_REQUEST", 400);
    const canonical = JSON.stringify({ requestType: value.requestType, currentRoleId: value.currentRoleId,
      requestedRoleId: value.requestedRoleId, reason: value.reason,
      effectiveDate: value.effectiveDate?.toISOString().slice(0, 10) ?? null,
      expirationDate: value.expirationDate?.toISOString().slice(0, 10) ?? null });
    try {
      return await this.repository.submit({ ...value, id: randomUUID(), requesterId: actor.id,
        requestNumber: "AR-" + randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase(),
        payloadHash: createHash("sha256").update(canonical).digest("hex"), submittedAt: new Date() });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code === "IDEMPOTENCY_CONFLICT") throw new PortalRequestError("IDEMPOTENCY_CONFLICT", 409);
      if (code === "CATALOG_UNAVAILABLE") throw new PortalRequestError("CATALOG_UNAVAILABLE", 409);
      throw error;
    }
  }
  async list(identity: AuthenticatedUser) {
    const actor = await this.actor(identity); return { requests: await this.repository.listForRequester(actor.id) };
  }
  async detail(identity: AuthenticatedUser, id: string) {
    if (!uuid.test(id)) throw new PortalRequestError("INVALID_REQUEST", 400);
    const actor = await this.actor(identity), request = await this.repository.findForRequester(id, actor.id);
    if (!request) throw new PortalRequestError("REQUEST_NOT_FOUND", 404);
    return request;
  }
}
