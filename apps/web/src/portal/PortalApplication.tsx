import type { AuthenticatedIdentityResponse } from "@access-portal/contracts";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthApiClient } from "../auth/authApi.js";
import type { AuthContextValue, PortalRole } from "../auth/types.js";
import { useAuth } from "../auth/useAuth.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { AccessCatalogPage } from "../pages/AccessCatalogPage.js";
import { AccessDeniedPage } from "../pages/AccessDeniedPage.js";
import { ApprovalsPage } from "../pages/ApprovalsPage.js";
import { AuditLogsPage } from "../pages/AuditLogsPage.js";
import { AutomationJobsPage } from "../pages/AutomationJobsPage.js";
import { DashboardPage } from "../pages/DashboardPage.js";
import { LegacyRequestsPage } from "../pages/LegacyRequestsPage.js";
import { MyRequestsPage } from "../pages/MyRequestsPage.js";
import { SettingsPage } from "../pages/SettingsPage.js";
import { UsersPage } from "../pages/UsersPage.js";
import { AppShell } from "./AppShell.js";
import { hasRequiredRole } from "./navigation.js";

interface RoleRouteProps {
  readonly userRoles: readonly PortalRole[];
  readonly requiredRoles: readonly PortalRole[];
  readonly children: ReactNode;
}

function RoleRoute({
  userRoles,
  requiredRoles,
  children,
}: RoleRouteProps) {
  return hasRequiredRole(userRoles, requiredRoles) ? (
    children
  ) : (
    <AccessDeniedPage />
  );
}

export interface PortalViewProps {
  readonly identity: AuthenticatedIdentityResponse;
  readonly onSignOut: () => Promise<void>;
}

export function PortalView({ identity, onSignOut }: PortalViewProps) {
  return (
    <AppShell identity={identity} onSignOut={onSignOut}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/requests" element={<MyRequestsPage />} />
        <Route path="/catalog" element={<AccessCatalogPage />} />
        <Route
          path="/approvals"
          element={
            <RoleRoute
              userRoles={identity.roles}
              requiredRoles={["Admin", "Approver"]}
            >
              <ApprovalsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/users"
          element={
            <RoleRoute userRoles={identity.roles} requiredRoles={["Admin"]}>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route path="/legacy-requests" element={<LegacyRequestsPage />} />
        <Route
          path="/automation-jobs"
          element={
            <RoleRoute userRoles={identity.roles} requiredRoles={["Admin"]}>
              <AutomationJobsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RoleRoute userRoles={identity.roles} requiredRoles={["Admin"]}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleRoute userRoles={identity.roles} requiredRoles={["Admin"]}>
              <SettingsPage />
            </RoleRoute>
          }
        />
        <Route path="*" element={<AccessDeniedPage />} />
      </Routes>
    </AppShell>
  );
}

interface LoginPageProps {
  readonly state: AuthContextValue["state"];
  readonly onLogin: () => Promise<void>;
}

export function LoginPage({ state, onLogin }: LoginPageProps) {
  const unconfigured = state === "unconfigured";
  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__brand">
          <span className="brand__mark" aria-hidden="true">
            AM
          </span>
          <span>
            <strong>Access Management Portal</strong>
            <small>Internal access governance</small>
          </span>
        </div>
        <p className="page-eyebrow">Local pilot environment</p>
        <h1 id="login-title">One place to understand access.</h1>
        <p className="login-card__intro">
          Sign in with your company Microsoft account to open the local portal
          experience.
        </p>
        <button
          className="button button--primary button--login"
          type="button"
          disabled={unconfigured || state === "authenticating"}
          onClick={() => void onLogin()}
        >
          <span className="microsoft-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          {state === "authenticating" ? "Signing in…" : "Sign in with Microsoft"}
        </button>
        {unconfigured ? (
          <p className="login-card__message" role="status">
            Local Microsoft Entra configuration is not available.
          </p>
        ) : null}
        <div className="login-card__safety">
          <StatusBadge tone="success">Read-only pilot</StatusBadge>
          <p>No production systems or automated access changes are connected.</p>
        </div>
      </section>
      <aside className="login-aside" aria-label="Pilot capabilities">
        <div>
          <p className="page-eyebrow">Access visibility</p>
          <h2>Clear requests, approvals, and audit context.</h2>
          <ul>
            <li>Normalized role and access catalog</li>
            <li>Role-aware workspaces</li>
            <li>Explicit integration safety status</li>
          </ul>
        </div>
        <small>Access Management Portal · Local development</small>
      </aside>
    </main>
  );
}

function SessionGate({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <main className="session-gate">
      <span className="session-gate__mark" aria-hidden="true">
        AM
      </span>
      <StatusBadge tone="warning">Local pilot</StatusBadge>
      <h1>{title}</h1>
      <p>{description}</p>
      {action}
    </main>
  );
}

function AuthenticatedPortal({ auth }: { readonly auth: AuthContextValue }) {
  const [identity, setIdentity] =
    useState<AuthenticatedIdentityResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const api = useMemo(
    () => new AuthApiClient(auth.getAccessToken),
    [auth.getAccessToken],
  );

  useEffect(() => {
    let active = true;
    setFailed(false);
    api
      .getMe()
      .then((result) => {
        if (active) {
          setIdentity(result);
        }
      })
      .catch(() => {
        if (active) {
          setIdentity(null);
          setFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [api, attempt]);

  if (failed) {
    return (
      <SessionGate
        title="Session verification failed"
        description="The local API could not verify this session. No portal data was loaded."
        action={
          <div className="session-gate__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void auth.logout()}
            >
              Sign out
            </button>
          </div>
        }
      />
    );
  }

  if (!identity) {
    return (
      <SessionGate
        title="Verifying your session"
        description="Confirming identity and portal roles with the local API."
      />
    );
  }

  return <PortalView identity={identity} onSignOut={auth.logout} />;
}

export function PortalApplication() {
  const auth = useAuth();

  if (auth.state !== "authenticated" || !auth.user) {
    return <LoginPage state={auth.state} onLogin={auth.login} />;
  }

  return <AuthenticatedPortal auth={auth} />;
}
