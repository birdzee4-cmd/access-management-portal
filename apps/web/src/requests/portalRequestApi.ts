import type {
  PortalAccessRequest, PortalAccessRequestListResponse, PortalAccessRequestSubmission,
  PortalAccessRequestSubmissionResponse, PortalRequestCatalogResponse,
} from "@access-portal/contracts";
import type { AccessTokenProvider } from "../auth/authApi.js";

export class PortalRequestApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code); this.name = "PortalRequestApiError";
  }
}

function base(value: string | undefined): string {
  const result = value?.trim() || "/api";
  if (result.startsWith("/")) return result.replace(/\/$/, "");
  const parsed = new URL(result);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") throw new Error("VITE_API_BASE_URL must use HTTPS unless it targets localhost.");
  return parsed.toString().replace(/\/$/, "");
}

export class PortalRequestApiClient {
  private readonly baseUrl: string;
  constructor(private readonly getAccessToken: AccessTokenProvider, baseUrl?: string) {
    this.baseUrl = base(baseUrl ?? import.meta.env.VITE_API_BASE_URL);
  }
  catalog(): Promise<PortalRequestCatalogResponse> { return this.request("/portal/catalog", "GET"); }
  list(): Promise<PortalAccessRequestListResponse> { return this.request("/portal/requests", "GET"); }
  detail(id: string): Promise<PortalAccessRequest> { return this.request("/portal/requests/" + encodeURIComponent(id), "GET"); }
  submit(input: PortalAccessRequestSubmission): Promise<PortalAccessRequestSubmissionResponse> {
    return this.request("/portal/requests", "POST", input);
  }
  private async request<T>(path: string, method: "GET" | "POST", body?: PortalAccessRequestSubmission): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(this.baseUrl + path, { method, headers: {
      authorization: "Bearer " + token, ...(body ? { "content-type": "application/json" } : {}),
    }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) {
      let code = "portal_request_unavailable";
      try { const value = await response.json() as { error?: unknown }; if (typeof value.error === "string") code = value.error; } catch { /* sanitized fallback */ }
      throw new PortalRequestApiError(response.status, code);
    }
    return await response.json() as T;
  }
}
