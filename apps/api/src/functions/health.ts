import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { HealthResponse } from "@access-portal/contracts";
import { readLegacySafetyPolicy } from "@access-portal/shared";

export async function health(
  _request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const safetyPolicy = readLegacySafetyPolicy(process.env);
    const body: HealthResponse = {
      status: "ok",
      service: "access-management-portal-api",
      legacyIntegrationMode: safetyPolicy.legacyIntegrationMode,
    };

    return { status: 200, jsonBody: body };
  } catch {
    const body: HealthResponse = {
      status: "configuration_error",
      service: "access-management-portal-api",
      legacyIntegrationMode: "BLOCKED",
    };

    return { status: 503, jsonBody: body };
  }
}

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: health,
});
