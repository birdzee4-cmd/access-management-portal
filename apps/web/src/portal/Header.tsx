import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";

import { StatusBadge } from "../components/StatusBadge.js";

export interface HeaderProps {
  readonly identity: AuthenticatedIdentityResponse;
  readonly onSignOut: () => Promise<void>;
}

function initials(displayName: string): string {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Header({ identity, onSignOut }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="top-header__context">
        <span className="top-header__mobile-title">Access Management Portal</span>
        <StatusBadge tone="warning">Local pilot</StatusBadge>
      </div>
      <div className="user-menu">
        <span className="user-avatar" aria-hidden="true">
          {initials(identity.displayName)}
        </span>
        <span className="user-summary">
          <strong>{identity.displayName}</strong>
          <small>{identity.roles.join(" · ")}</small>
        </span>
        <button
          className="button button--secondary button--compact"
          type="button"
          onClick={() => void onSignOut()}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
