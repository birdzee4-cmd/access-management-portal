import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";
import type { PropsWithChildren } from "react";

import { Header } from "./Header.js";
import { Sidebar } from "./Sidebar.js";

export interface AppShellProps extends PropsWithChildren {
  readonly identity: AuthenticatedIdentityResponse;
  readonly onSignOut: () => Promise<void>;
}

export function AppShell({
  identity,
  onSignOut,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Sidebar roles={identity.roles} />
      <div className="app-frame">
        <Header identity={identity} onSignOut={onSignOut} />
        <main className="main-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
