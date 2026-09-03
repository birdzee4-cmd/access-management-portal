import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";

import {
  AuthenticationConfigurationError,
  AuthenticationError,
  AuthorizationError,
  getAdminTestIdentity,
  getAuthenticatedIdentity,
  getRuntimeAuthenticationService,
} from "../auth/index.js";

function errorResponse(error: unknown): HttpResponseInit {
  if (error instanceof AuthenticationError) {
    return {
      status: error.statusCode,
      headers: {
        "cache-control": "no-store",
        "www-authenticate": "Bearer",
      },
      jsonBody: { error: error.code },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: error.statusCode,
      headers: { "cache-control": "no-store" },
      jsonBody: { error: error.code },
    };
  }

  if (error instanceof AuthenticationConfigurationError) {
    return {
      status: 503,
      headers: { "cache-control": "no-store" },
      jsonBody: { error: "authentication_not_configured" },
    };
  }

  return {
    status: 500,
    headers: { "cache-control": "no-store" },
    jsonBody: { error: "authentication_failed" },
  };
}

export async function authMe(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const identity = await getAuthenticatedIdentity(
      request,
      getRuntimeAuthenticationService(),
    );
    return {
      status: 200,
      headers: { "cache-control": "no-store" },
      jsonBody: identity,
    };
  } catch (error) {
    return errorResponse(error);
  }
}

export async function adminTest(
  request: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const identity = await getAdminTestIdentity(
      request,
      getRuntimeAuthenticationService(),
    );
    return {
      status: 200,
      headers: { "cache-control": "no-store" },
      jsonBody: identity,
    };
  } catch (error) {
    return errorResponse(error);
  }
}

app.http("auth-me", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/me",
  handler: authMe,
});

app.http("auth-admin-test", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "auth/admin-test",
  handler: adminTest,
});
