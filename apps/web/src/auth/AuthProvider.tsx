import { InteractionStatus, type AccountInfo } from "@azure/msal-browser";
import { MsalProvider, useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";

import {
  createMsalClient,
  readFrontendAuthConfiguration,
  type FrontendAuthConfiguration,
} from "./authConfig";
import { AuthContext } from "./context";
import { portalRoles, type AuthenticatedUser, type PortalRole } from "./types";

function getRoles(account: AccountInfo): PortalRole[] {
  const roles = account.idTokenClaims?.roles;
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter(
    (role): role is PortalRole =>
      typeof role === "string" && portalRoles.some((portalRole) => portalRole === role),
  );
}

function getUser(account: AccountInfo): AuthenticatedUser {
  const objectId = account.idTokenClaims?.oid;

  return {
    entraObjectId: typeof objectId === "string" ? objectId : account.localAccountId,
    email: account.username,
    displayName: account.name ?? account.username,
    roles: getRoles(account),
  };
}

function MsalAuthBridge({
  auth,
  children,
}: PropsWithChildren<{ readonly auth: FrontendAuthConfiguration }>) {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = instance.getActiveAccount() ?? accounts[0] ?? null;

  useEffect(() => {
    if (!instance.getActiveAccount() && account) {
      instance.setActiveAccount(account);
    }
  }, [account, instance]);

  const value = useMemo(
    () => ({
      state:
        inProgress !== InteractionStatus.None
          ? ("authenticating" as const)
          : isAuthenticated && account
            ? ("authenticated" as const)
            : ("unauthenticated" as const),
      user: account ? getUser(account) : null,
      login: async () => {
        await instance.loginRedirect({ scopes: [auth.apiScope] });
      },
      logout: async () => {
        await instance.logoutRedirect({ account: account ?? undefined });
      },
      getAccessToken: async () => {
        if (!account) {
          throw new Error("An authenticated account is required before acquiring an access token.");
        }

        const result = await instance.acquireTokenSilent({
          account,
          scopes: [auth.apiScope],
        });
        return result.accessToken;
      },
    }),
    [account, auth.apiScope, inProgress, instance, isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [configuration] = useState(() => readFrontendAuthConfiguration(import.meta.env));
  const [client] = useState(() =>
    configuration ? createMsalClient(configuration) : null,
  );

  if (!configuration || !client) {
    return <>{children}</>;
  }

  return (
    <MsalProvider instance={client}>
      <MsalAuthBridge auth={configuration}>{children}</MsalAuthBridge>
    </MsalProvider>
  );
}
