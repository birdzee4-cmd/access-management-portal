import assert from "node:assert/strict";
import test from "node:test";
import type { PortalCatalogRole } from "@access-portal/contracts";
import type { PortalRequestRepository } from "@access-portal/database";
import type { AuthenticatedUser } from "../auth/index.js";
import { PortalRequestService } from "./portal-request.service.js";

const actor: AuthenticatedUser = { entraObjectId: "00000000-0000-4000-8000-000000000001",
  email: "person@example.invalid", displayName: "Person", roles: ["Viewer"], claims: {}, authenticationSource: "ENTRA" };
const role = (id: string, systemId = "00000000-0000-4000-8000-000000000010"): PortalCatalogRole => ({
  id, systemId, systemCode: "DEMO", systemName: "Demo", applicationId: null,
  applicationName: null, contextId: null, contextName: null, code: id.slice(-4), name: "Role",
});
const first = role("00000000-0000-4000-8000-000000000101");
const second = role("00000000-0000-4000-8000-000000000102");
function repository(): PortalRequestRepository {
  return {
    findActorByEntraObjectId: async () => ({ id: "portal-user", entraObjectId: actor.entraObjectId, active: true }),
    listActiveCatalogRoles: async () => [first, second],
    findActiveCatalogRole: async (id) => [first, second].find((item) => item.id === id) ?? null,
    submit: async (input) => ({ replayed: false, request: { id: input.id, requestNumber: input.requestNumber,
      requestType: input.requestType, reason: input.reason, status: "SUBMITTED", version: 1,
      submittedAt: input.submittedAt.toISOString(), effectiveDate: null, expirationDate: null,
      item: { action: input.requestType, currentRole: input.currentRoleId ? first : null,
        requestedRole: input.requestedRoleId ? second : null, status: "PENDING" } } }),
    listForRequester: async () => [], findForRequester: async () => null,
  };
}

test("ADD, REMOVE and CHANGE validate explicit role semantics", async () => {
  const service = new PortalRequestService(repository());
  const key = "00000000-0000-4000-8000-000000000201";
  assert.equal((await service.submit(actor, { requestType: "ADD", requestedRoleId: first.id, reason: "Required for demo duties", idempotencyKey: key })).request.requestType, "ADD");
  assert.equal((await service.submit(actor, { requestType: "REMOVE", currentRoleId: first.id, reason: "No longer needed for duties", idempotencyKey: key })).request.requestType, "REMOVE");
  assert.equal((await service.submit(actor, { requestType: "CHANGE", currentRoleId: first.id, requestedRoleId: second.id, reason: "Duties have changed now", idempotencyKey: key })).request.requestType, "CHANGE");
});

test("invalid combinations and cross-system changes fail closed", async () => {
  const service = new PortalRequestService(repository());
  const key = "00000000-0000-4000-8000-000000000201";
  await assert.rejects(service.submit(actor, { requestType: "ADD", currentRoleId: first.id, reason: "Required for demo duties", idempotencyKey: key }), /INVALID_REQUEST/);
  const repo = repository();
  repo.findActiveCatalogRole = async (id) => id === first.id ? first : role(second.id, "00000000-0000-4000-8000-000000000099");
  await assert.rejects(new PortalRequestService(repo).submit(actor, { requestType: "CHANGE", currentRoleId: first.id, requestedRoleId: second.id, reason: "Duties have changed now", idempotencyKey: key }), /INVALID_REQUEST/);
});

test("missing and inactive Portal users are denied before persistence", async () => {
  const missing = repository(); missing.findActorByEntraObjectId = async () => null;
  await assert.rejects(new PortalRequestService(missing).list(actor), /PORTAL_USER_NOT_FOUND/);
  const inactive = repository(); inactive.findActorByEntraObjectId = async () => ({ id: "x", entraObjectId: actor.entraObjectId, active: false });
  await assert.rejects(new PortalRequestService(inactive).catalog(actor), /PORTAL_USER_INACTIVE/);
});
