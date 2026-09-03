import { portalRoles, type PortalRole } from "@access-portal/contracts";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTPayload,
} from "jose";

import type { EntraAuthenticationConfiguration } from "./configuration.js";
import type { AccessTokenValidator, AuthenticatedUser } from "./types.js";

function stringClaim(payload: JWTPayload, names: readonly string[]): string | null {
  for (const name of names) {
    const value = payload[name];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function recognizedRoles(payload: JWTPayload): PortalRole[] {
  if (!Array.isArray(payload.roles)) {
    return [];
  }

  return payload.roles.filter(
    (role): role is PortalRole =>
      typeof role === "string" && portalRoles.some((portalRole) => portalRole === role),
  );
}

export class EntraJwtAccessTokenValidator implements AccessTokenValidator {
  private readonly signingKeys: JWTVerifyGetKey;

  constructor(
    private readonly configuration: EntraAuthenticationConfiguration,
    signingKeys: JWTVerifyGetKey = createRemoteJWKSet(
      new URL(configuration.jwksUri),
    ),
  ) {
    this.signingKeys = signingKeys;
  }

  async validate(accessToken: string): Promise<AuthenticatedUser> {
    const { payload } = await jwtVerify(accessToken, this.signingKeys, {
      issuer: this.configuration.expectedIssuers,
      audience: this.configuration.expectedAudience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "iss", "aud", "sub", "tid", "oid"],
      clockTolerance: 5,
    });

    if (payload.tid !== this.configuration.tenantId) {
      throw new Error("The access token tenant is not trusted.");
    }

    const entraObjectId = stringClaim(payload, ["oid"]);
    const email = stringClaim(payload, ["preferred_username", "email", "upn"]);

    if (!entraObjectId || !email) {
      throw new Error("The access token is missing required identity claims.");
    }

    return {
      entraObjectId,
      email,
      displayName: stringClaim(payload, ["name"]) ?? email,
      roles: recognizedRoles(payload),
      claims: payload,
      authenticationSource: "ENTRA",
    };
  }
}
