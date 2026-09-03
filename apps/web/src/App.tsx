import type { PilotStatus } from "@access-portal/contracts";
import { useAuth } from "./auth/useAuth";

const pilotStatus: PilotStatus = {
  projectName: "Access Management Portal",
  phase: "LOCAL_SKELETON",
  legacyIntegrationMode: "READ_ONLY",
};

export function App() {
  const auth = useAuth();

  return (
    <main className="shell">
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">Internal platform pilot</p>
        <h1 id="page-title">{pilotStatus.projectName}</h1>
        <p className="summary">
          The local application skeleton is ready. No production systems are connected.
        </p>
        <dl className="status-grid">
          <div>
            <dt>Phase</dt>
            <dd>Local skeleton</dd>
          </div>
          <div>
            <dt>Legacy integrations</dt>
            <dd className="safe">Read only</dd>
          </div>
          <div>
            <dt>First planned pilot</dt>
            <dd>Azure DevOps / VSTS</dd>
          </div>
        </dl>
        <aside className="notice">
          Provisioning, revocation, automation, and legacy writes are disabled.
        </aside>
        <section aria-labelledby="authentication-title">
          <h2 id="authentication-title">Authentication foundation</h2>
          <p>
            Status: <strong>{auth.state}</strong>
          </p>
          {auth.user ? (
            <>
              <p>Signed in as {auth.user.displayName}</p>
              <button type="button" onClick={() => void auth.logout()}>
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={auth.state === "unconfigured" || auth.state === "authenticating"}
              onClick={() => void auth.login()}
            >
              Sign in with Microsoft Entra ID
            </button>
          )}
        </section>
      </section>
    </main>
  );
}
