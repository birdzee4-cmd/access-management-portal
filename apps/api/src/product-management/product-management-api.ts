import type { ProductManagementRequestSubmission } from "@access-portal/contracts";
import type { HttpResponseInit } from "@azure/functions";
import { AuthenticationConfigurationError, AuthenticationError, AuthorizationError, requireAuthenticatedUser, requireRole, type AuthenticationRequest, type AuthenticationService } from "../auth/index.js";
import { isSupportedProductManagementContext, listMockProductManagementRequests, mockProductManagementForm, submitMockProductManagementRequest } from "./mock-product-management.js";
import { ProductManagementMasterDataConfigurationError, ProductManagementMasterDataService, ProductManagementMasterDataValidationError } from "./product-management-master-data.js";

export interface ProductManagementHttpRequest extends AuthenticationRequest { readonly params?: Readonly<Record<string, string | undefined>>; readonly query?: Pick<URLSearchParams, "get">; json(): Promise<unknown>; }
export interface ProductManagementApiDependencies { readonly getAuthenticationService: () => AuthenticationService; readonly getMasterDataService: () => ProductManagementMasterDataService; }
const result = (status: number, jsonBody: unknown): HttpResponseInit => ({ status, headers: { "cache-control": "no-store" }, jsonBody });
function errorResponse(error: unknown): HttpResponseInit {
  if (error instanceof AuthenticationError) return { ...result(401, { error: error.code }), headers: { "cache-control": "no-store", "www-authenticate": "Bearer" } };
  if (error instanceof AuthorizationError) return result(403, { error: error.code });
  if (error instanceof AuthenticationConfigurationError) return result(503, { error: "authentication_not_configured" });
  if (error instanceof ProductManagementMasterDataValidationError) return result(400, { error: "invalid_product_management_master_data_request" });
  if (error instanceof ProductManagementMasterDataConfigurationError) return result(503, { error: "product_management_master_data_unavailable" });
  return result(500, { error: "product_management_unavailable" });
}
async function identity(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies) { return requireRole(await requireAuthenticatedUser(request, dependencies.getAuthenticationService()), "Admin", "Approver", "Viewer"); }
const invalid = () => result(400, { error: "invalid_product_management_request" });
function parseSubmission(value: unknown): ProductManagementRequestSubmission | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !["country", "topic", "fields", "idempotencyKey"].includes(key))) return null;
  if (typeof input.country !== "string" || typeof input.topic !== "string" || typeof input.idempotencyKey !== "string" || !input.idempotencyKey.trim()) return null;
  if (!input.fields || typeof input.fields !== "object" || Array.isArray(input.fields) || Object.values(input.fields).some((field) => typeof field !== "string")) return null;
  if (!isSupportedProductManagementContext(input.country, input.topic)) return null;
  const fields = input.fields as Record<string, string>;
  if (mockProductManagementForm(input.country, input.topic).fields.some((field) => field.required && !fields[field.key]?.trim())) return null;
  return { country: input.country, topic: input.topic, fields, idempotencyKey: input.idempotencyKey };
}
export async function handleProductManagementList(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { await identity(request, dependencies); return result(200, listMockProductManagementRequests()); } catch (error) { return errorResponse(error); } }
export async function handleProductManagementCountries(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { await identity(request, dependencies); return result(200, await dependencies.getMasterDataService().countries()); } catch (error) { return errorResponse(error); } }
export async function handleProductManagementTopics(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { await identity(request, dependencies); return result(200, await dependencies.getMasterDataService().topics(request.params?.country ?? "")); } catch (error) { return errorResponse(error); } }
export async function handleProductManagementForm(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { await identity(request, dependencies); return result(200, await dependencies.getMasterDataService().form(request.params?.country ?? "", request.params?.topic ?? "")); } catch (error) { return errorResponse(error); } }
export async function handleProductManagementLookup(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { await identity(request, dependencies); const get = (name: string) => request.query?.get(name)?.trim() || undefined; const country = get("country"), topic = get("topic"); if (!country || !topic) throw new ProductManagementMasterDataValidationError(); return result(200, await dependencies.getMasterDataService().lookup(request.params?.lookup ?? "", { country, topic, providerType: get("providerType"), package: get("package"), appName: get("appName") })); } catch (error) { return errorResponse(error); } }
export async function handleProductManagementSubmit(request: ProductManagementHttpRequest, dependencies: ProductManagementApiDependencies): Promise<HttpResponseInit> { try { const authenticated = await identity(request, dependencies); const input = parseSubmission(await request.json()); return input ? result(201, submitMockProductManagementRequest(input, authenticated.displayName)) : invalid(); } catch (error) { return errorResponse(error); } }
