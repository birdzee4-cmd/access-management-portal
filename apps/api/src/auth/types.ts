import type { PortalRole } from "@access-portal/contracts";

export interface AuthenticatedUser {
  readonly entraObjectId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly PortalRole[];
  readonly claims: Readonly<Record<string, unknown>>;
  readonly authenticationSource: "ENTRA" | "DEVELOPMENT_MOCK";
}

export interface HeaderReader {
  get(name: string): string | null;
}

export interface AuthenticationRequest {
  readonly headers: HeaderReader;
}

export interface AccessTokenValidator {
  validate(accessToken: string): Promise<AuthenticatedUser>;
}
