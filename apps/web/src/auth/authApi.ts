import type {
  AdminTestResponse,
  AuthenticatedIdentityResponse,
  LegacyMatrixRowsResponse,
  LegacyMatrixSource,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";

export type AccessTokenProvider = () => Promise<string>;

export class AuthApiError extends Error {
  constructor(readonly status: number) {
    super("Portal API request failed with status " + status + ".");
    this.name = "AuthApiError";
  }
}

function normalizeApiBaseUrl(value: string | undefined): string {
  const baseUrl = value?.trim() || "/api";

  if (baseUrl.startsWith("/")) {
    return baseUrl.replace(/\/$/, "");
  }

  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("VITE_API_BASE_URL must use HTTPS unless it targets localhost.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export class AuthApiClient {
  private readonly baseUrl: string;

  constructor(
    private readonly getAccessToken: AccessTokenProvider,
    baseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL,
  ) {
    this.baseUrl = normalizeApiBaseUrl(baseUrl);
  }

  getMe(): Promise<AuthenticatedIdentityResponse> {
    return this.get("/auth/me");
  }

  getAdminTest(): Promise<AdminTestResponse> {
    return this.get("/auth/admin-test");
  }

  getLegacyMatrixRows(
    source: LegacyMatrixSource,
    limit: 20 | 50,
  ): Promise<LegacyMatrixRowsResponse> {
    const query = new URLSearchParams({ source, limit: String(limit) });
    return this.get("/legacy/matrix?" + query.toString());
  }

  getLegacyMatrixSummary(
    source: LegacyMatrixSource,
  ): Promise<LegacyMatrixSummaryResponse> {
    const query = new URLSearchParams({ source });
    return this.get("/legacy/matrix/summary?" + query.toString());
  }

  private async get<T>(path: string): Promise<T> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(this.baseUrl + path, {
      method: "GET",
      headers: {
        authorization: "Bearer " + accessToken,
      },
    });

    if (!response.ok) {
      throw new AuthApiError(response.status);
    }

    return (await response.json()) as T;
  }
}
