import type { PortalAccessRequestSubmission } from "@access-portal/contracts";
import type { HttpResponseInit } from "@azure/functions";
import {
  AuthenticationConfigurationError, AuthenticationError, AuthorizationError,
  requireAuthenticatedUser, requireRole, type AuthenticationRequest, type AuthenticationService,
} from "../auth/index.js";
import { PortalRequestError, type PortalRequestService } from "../services/index.js";

type Service = Pick<PortalRequestService, "catalog" | "submit" | "list" | "detail">;
export interface PortalRequestApiDependencies {
  readonly getAuthenticationService: () => AuthenticationService;
  readonly getPortalRequestService: () => Service;
}
export interface PortalRequestHttpRequest extends AuthenticationRequest {
  readonly params?: Readonly<Record<string, string | undefined>>;
  json(): Promise<unknown>;
}

const allowedKeys = new Set(["requestType", "currentRoleId", "requestedRoleId", "reason", "effectiveDate", "expirationDate", "idempotencyKey"]);
export function parseSubmission(value: unknown): PortalAccessRequestSubmission {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PortalRequestError("INVALID_REQUEST", 400);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.has(key)) ||
    typeof record.requestType !== "string" || typeof record.reason !== "string" ||
    typeof record.idempotencyKey !== "string" ||
    ["currentRoleId", "requestedRoleId", "effectiveDate", "expirationDate"].some((key) => record[key] !== undefined && typeof record[key] !== "string")) {
    throw new PortalRequestError("INVALID_REQUEST", 400);
  }
  return record as unknown as PortalAccessRequestSubmission;
}

function response(error: unknown): HttpResponseInit {
  if (error instanceof AuthenticationError) return { status: 401, headers: { "cache-control": "no-store", "www-authenticate": "Bearer" }, jsonBody: { error: error.code } };
  if (error instanceof AuthorizationError) return { status: 403, headers: { "cache-control": "no-store" }, jsonBody: { error: error.code } };
  if (error instanceof AuthenticationConfigurationError) return { status: 503, headers: { "cache-control": "no-store" }, jsonBody: { error: "authentication_not_configured" } };
  if (error instanceof PortalRequestError) return { status: error.statusCode, headers: { "cache-control": "no-store" }, jsonBody: { error: error.code.toLowerCase() } };
  return { status: 500, headers: { "cache-control": "no-store" }, jsonBody: { error: "portal_request_unavailable" } };
}

async function identity(request: PortalRequestHttpRequest, dependencies: PortalRequestApiDependencies) {
  const user = await requireAuthenticatedUser(request, dependencies.getAuthenticationService());
  return requireRole(user, "Admin", "Approver", "Viewer");
}
export async function handlePortalCatalog(request: PortalRequestHttpRequest, dependencies: PortalRequestApiDependencies): Promise<HttpResponseInit> {
  try { const user = await identity(request, dependencies); return { status: 200, headers: { "cache-control": "no-store" }, jsonBody: await dependencies.getPortalRequestService().catalog(user) }; }
  catch (error) { return response(error); }
}
export async function handlePortalRequestList(request: PortalRequestHttpRequest, dependencies: PortalRequestApiDependencies): Promise<HttpResponseInit> {
  try { const user = await identity(request, dependencies); return { status: 200, headers: { "cache-control": "no-store" }, jsonBody: await dependencies.getPortalRequestService().list(user) }; }
  catch (error) { return response(error); }
}
export async function handlePortalRequestDetail(request: PortalRequestHttpRequest, dependencies: PortalRequestApiDependencies): Promise<HttpResponseInit> {
  try { const user = await identity(request, dependencies), id = request.params?.id ?? ""; return { status: 200, headers: { "cache-control": "no-store" }, jsonBody: await dependencies.getPortalRequestService().detail(user, id) }; }
  catch (error) { return response(error); }
}
export async function handlePortalRequestSubmit(request: PortalRequestHttpRequest, dependencies: PortalRequestApiDependencies): Promise<HttpResponseInit> {
  try {
    const user = await identity(request, dependencies);
    const result = await dependencies.getPortalRequestService().submit(user, parseSubmission(await request.json()));
    return { status: result.replayed ? 200 : 201, headers: { "cache-control": "no-store" }, jsonBody: result };
  } catch (error) { return response(error); }
}
