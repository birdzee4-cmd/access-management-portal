import type { PortalRole } from "@access-portal/contracts";

export { portalRoles, type PortalRole } from "@access-portal/contracts";

export type AuthenticationState =
  | "unconfigured"
  | "unauthenticated"
  | "authenticating"
  | "authenticated";

export interface AuthenticatedUser {
  readonly entraObjectId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly PortalRole[];
}

export interface AuthContextValue {
  readonly state: AuthenticationState;
  readonly user: AuthenticatedUser | null;
  readonly login: () => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly getAccessToken: () => Promise<string>;
}
