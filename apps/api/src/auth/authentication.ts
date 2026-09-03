import type { PortalRole } from "@access-portal/contracts";

import {
  AuthenticationConfigurationError,
  readEntraAuthenticationConfiguration,
  type AuthenticationEnvironment,
} from "./configuration.js";
import { EntraJwtAccessTokenValidator } from "./token-validator.js";
import type {
  AccessTokenValidator,
  AuthenticatedUser,
  AuthenticationRequest,
  HeaderReader,
} from "./types.js";

export class AuthenticationError extends Error {
  readonly statusCode = 401;
  readonly code: "missing_authentication" | "invalid_token";

  constructor(
    code: "missing_authentication" | "invalid_token",
    message: string,
  ) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  readonly statusCode = 403;
  readonly code = "insufficient_role";

  constructor(requiredRoles: readonly PortalRole[]) {
    super("One of the following application roles is required: " + requiredRoles.join(", "));
    this.name = "AuthorizationError";
  }
}

function readBearerToken(headers: HeaderReader): string {
  const authorization = headers.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);

  if (!match?.[1]) {
    throw new AuthenticationError(
      "missing_authentication",
      "A valid Authorization: Bearer access token is required.",
    );
  }

  return match[1];
}

function developmentMockUser(
  headers: HeaderReader,
  environment: AuthenticationEnvironment,
): AuthenticatedUser | null {
  const enabled = environment.ENABLE_DEV_AUTH_MOCK;

  if (enabled !== undefined && enabled !== "false" && enabled !== "true") {
    throw new AuthenticationConfigurationError(
      "ENABLE_DEV_AUTH_MOCK must be true, false, or unset.",
    );
  }

  if (enabled !== "true") {
    return null;
  }

  if (environment.APP_ENV !== "development") {
    throw new AuthenticationConfigurationError(
      "Development authentication mock is forbidden unless APP_ENV=development.",
    );
  }

  if (headers.get("x-development-auth") !== "enabled") {
    return null;
  }

  return {
    entraObjectId: "00000000-0000-4000-8000-00000000d001",
    email: "dev.user@example.invalid",
    displayName: "Development Mock User",
    roles: ["Viewer"],
    claims: {
      auth_source: "DEVELOPMENT_MOCK",
    },
    authenticationSource: "DEVELOPMENT_MOCK",
  };
}

export class AuthenticationService {
  constructor(
    private readonly tokenValidator: AccessTokenValidator | null,
    private readonly environment: AuthenticationEnvironment = process.env,
  ) {}

  async authenticate(headers: HeaderReader): Promise<AuthenticatedUser> {
    const mockUser = developmentMockUser(headers, this.environment);
    if (mockUser) {
      return mockUser;
    }

    if (!this.tokenValidator) {
      throw new AuthenticationConfigurationError(
        "Microsoft Entra token validation is not configured.",
      );
    }

    const accessToken = readBearerToken(headers);
    try {
      return await this.tokenValidator.validate(accessToken);
    } catch {
      throw new AuthenticationError(
        "invalid_token",
        "The bearer access token is invalid or expired.",
      );
    }
  }
}

export function createAuthenticationService(
  environment: AuthenticationEnvironment = process.env,
): AuthenticationService {
  if (
    environment.ENABLE_DEV_AUTH_MOCK === "true" &&
    environment.APP_ENV === "development"
  ) {
    return new AuthenticationService(null, environment);
  }

  const configuration = readEntraAuthenticationConfiguration(environment);
  return new AuthenticationService(
    new EntraJwtAccessTokenValidator(configuration),
    environment,
  );
}

export function requireAuthenticatedUser(
  request: AuthenticationRequest,
  authentication: AuthenticationService,
): Promise<AuthenticatedUser> {
  return authentication.authenticate(request.headers);
}

export function requireRole(
  user: AuthenticatedUser,
  ...requiredRoles: readonly PortalRole[]
): AuthenticatedUser {
  if (
    requiredRoles.length === 0 ||
    !requiredRoles.some((requiredRole) => user.roles.includes(requiredRole))
  ) {
    throw new AuthorizationError(requiredRoles);
  }

  return user;
}
