import type { ProductManagementCountriesResponse, ProductManagementFormDefinition, ProductManagementLookupContext, ProductManagementLookupResponse, ProductManagementRequestListResponse, ProductManagementRequestSubmission, ProductManagementRequestSubmissionResponse, ProductManagementTopicsResponse } from "@access-portal/contracts";
import type { AccessTokenProvider } from "../auth/authApi.js";

export class ProductManagementApiClient {
  private readonly baseUrl: string;
  constructor(private readonly getAccessToken: AccessTokenProvider, baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api") { this.baseUrl = baseUrl.replace(/\/$/, ""); }
  list(): Promise<ProductManagementRequestListResponse> { return this.request("/product-management/requests", "GET"); }
  countries(): Promise<ProductManagementCountriesResponse> { return this.request("/product-management/countries", "GET"); }
  topics(country: string): Promise<ProductManagementTopicsResponse> { return this.request(`/product-management/countries/${encodeURIComponent(country)}/topics`, "GET"); }
  form(country: string, topic: string): Promise<ProductManagementFormDefinition> { return this.request(`/product-management/forms/${encodeURIComponent(country)}/${encodeURIComponent(topic)}`, "GET"); }
  lookup(name: string, context: ProductManagementLookupContext): Promise<ProductManagementLookupResponse> {
    const query = new URLSearchParams(); Object.entries(context).forEach(([key, value]) => { if (value) query.set(key, value); });
    return this.request(`/product-management/lookups/${encodeURIComponent(name)}?${query.toString()}`, "GET");
  }
  submit(input: ProductManagementRequestSubmission): Promise<ProductManagementRequestSubmissionResponse> { return this.request("/product-management/requests", "POST", input); }
  private async request<T>(path: string, method: "GET" | "POST", body?: ProductManagementRequestSubmission): Promise<T> {
    const response = await fetch(this.baseUrl + path, { method, headers: { authorization: `Bearer ${await this.getAccessToken()}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error("product_management_unavailable");
    return response.json() as Promise<T>;
  }
}
