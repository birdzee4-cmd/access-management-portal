import type { ProductManagementFormDefinition, ProductManagementRequestListResponse, ProductManagementRequestSubmission, ProductManagementRequestSubmissionResponse } from "@access-portal/contracts";
import type { AccessTokenProvider } from "../auth/authApi.js";

export class ProductManagementApiClient {
  private readonly baseUrl: string;
  constructor(private readonly getAccessToken: AccessTokenProvider, baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api") { this.baseUrl = baseUrl.replace(/\/$/, ""); }
  list(): Promise<ProductManagementRequestListResponse> { return this.request("/product-management/requests", "GET"); }
  form(country: string, topic: string): Promise<ProductManagementFormDefinition> { return this.request(`/product-management/forms/${encodeURIComponent(country)}/${encodeURIComponent(topic)}`, "GET"); }
  submit(input: ProductManagementRequestSubmission): Promise<ProductManagementRequestSubmissionResponse> { return this.request("/product-management/requests", "POST", input); }
  private async request<T>(path: string, method: "GET" | "POST", body?: ProductManagementRequestSubmission): Promise<T> {
    const response = await fetch(this.baseUrl + path, { method, headers: { authorization: `Bearer ${await this.getAccessToken()}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error("product_management_unavailable");
    return response.json() as Promise<T>;
  }
}
