import assert from "node:assert/strict";
import test from "node:test";
import { AuthenticationService, type AuthenticatedUser } from "../auth/index.js";
import { handlePortalRequestList, handlePortalRequestSubmit, parseSubmission, type PortalRequestApiDependencies, type PortalRequestHttpRequest } from "./portal-request-api.js";

const user: AuthenticatedUser = { entraObjectId: "00000000-0000-4000-8000-000000000001", email: "person@example.invalid",
  displayName: "Person", roles: ["Viewer"], claims: {}, authenticationSource: "ENTRA" };
const authentication = new AuthenticationService({ validate: async () => user });
const request = (body: unknown = {}): PortalRequestHttpRequest => ({
  headers: { get: (name) => name.toLowerCase() === "authorization" ? "Bearer synthetic" : null },
  json: async () => body,
});
function dependencies(calls: string[]): PortalRequestApiDependencies {
  return { getAuthenticationService: () => authentication, getPortalRequestService: () => ({
    catalog: async () => ({ roles: [] }), list: async (identity) => { calls.push(identity.entraObjectId); return { requests: [] }; },
    detail: async () => { throw new Error("unused"); }, submit: async (identity, input) => {
      calls.push(identity.entraObjectId + ":" + input.requestType);
      return { replayed: false, request: { id: "x" } as never };
    },
  }) };
}

test("list derives self-service scope from the verified identity", async () => {
  const calls: string[] = [];
  const result = await handlePortalRequestList(request(), dependencies(calls));
  assert.equal(result.status, 200);
  assert.deepEqual(calls, [user.entraObjectId]);
});

test("submit authenticates then accepts only the bounded contract", async () => {
  const calls: string[] = [];
  const result = await handlePortalRequestSubmit(request({ requestType: "ADD", requestedRoleId: "00000000-0000-4000-8000-000000000101",
    reason: "Required for assigned duties", idempotencyKey: "00000000-0000-4000-8000-000000000201" }), dependencies(calls));
  assert.equal(result.status, 201);
  assert.deepEqual(calls, [user.entraObjectId + ":ADD"]);
  assert.throws(() => parseSubmission({ requestType: "ADD", reason: "valid reason", idempotencyKey: "key", targetUserId: "someone" }), /INVALID_REQUEST/);
});

test("missing bearer token fails before the Portal service", async () => {
  const calls: string[] = [];
  const missing = { headers: { get: () => null }, json: async () => ({}) };
  const result = await handlePortalRequestList(missing, dependencies(calls));
  assert.equal(result.status, 401);
  assert.deepEqual(calls, []);
});

test("a valid identity without a Portal role is forbidden", async () => {
  const noRoleAuth = new AuthenticationService({ validate: async () => ({ ...user, roles: [] }) });
  const calls: string[] = [], deps = dependencies(calls);
  const result = await handlePortalRequestList(request(), { ...deps, getAuthenticationService: () => noRoleAuth });
  assert.equal(result.status, 403);
  assert.deepEqual(calls, []);
});
