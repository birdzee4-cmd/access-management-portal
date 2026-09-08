import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";
import type { PropsWithChildren } from "react";

import { Header } from "./Header.js";
import { Sidebar } from "./Sidebar.js";
import type { PortalFeatures } from "./features.js";

export interface AppShellProps extends PropsWithChildren {
  readonly identity: AuthenticatedIdentityResponse;
  readonly onSignOut: () => Promise<void>;
  readonly features: PortalFeatures;
}

export function AppShell({
  identity,
  onSignOut,
  children,
  features,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar roles={identity.roles} features={features} />
      <div className="app-frame">
        <Header identity={identity} onSignOut={onSignOut} />
        <main className="main-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
