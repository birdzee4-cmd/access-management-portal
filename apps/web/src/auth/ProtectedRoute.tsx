import type { PropsWithChildren, ReactNode } from "react";

import { useAuth } from "./useAuth";
import type { PortalRole } from "./types";

export interface ProtectedRouteProps extends PropsWithChildren {
  readonly roles?: readonly PortalRole[];
  readonly fallback?: ReactNode;
}

/**
 * Client-side route visibility only. The API must independently authenticate
 * the request and enforce every required role.
 */
export function ProtectedRoute({
  children,
  roles = [],
  fallback = null,
}: ProtectedRouteProps) {
  const { state, user } = useAuth();
  const hasRole =
    roles.length === 0 || roles.some((role) => user?.roles.includes(role) ?? false);

  return state === "authenticated" && hasRole ? children : fallback;
}
