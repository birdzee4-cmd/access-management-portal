import type {
  AdminTestResponse,
  AuthenticatedIdentityResponse,
} from "@access-portal/contracts";

import {
  requireAuthenticatedUser,
  requireRole,
  type AuthenticationService,
} from "./authentication.js";
import type { AuthenticationRequest, AuthenticatedUser } from "./types.js";

function safeIdentity(user: AuthenticatedUser): AuthenticatedIdentityResponse {
  return {
    authenticated: true,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
  };
}

export async function getAuthenticatedIdentity(
  request: AuthenticationRequest,
  authentication: AuthenticationService,
): Promise<AuthenticatedIdentityResponse> {
  const user = await requireAuthenticatedUser(request, authentication);
  return safeIdentity(user);
}

export async function getAdminTestIdentity(
  request: AuthenticationRequest,
  authentication: AuthenticationService,
): Promise<AdminTestResponse> {
  const user = await requireAuthenticatedUser(request, authentication);
  requireRole(user, "Admin");

  return {
    ...safeIdentity(user),
    authorizedRole: "Admin",
  };
}
