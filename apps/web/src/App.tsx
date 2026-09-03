import type { PilotStatus } from "@access-portal/contracts";
import { AuthenticationTestPanel } from "./auth/AuthenticationTestPanel";

const pilotStatus: PilotStatus = {
  projectName: "Access Management Portal",
  phase: "LOCAL_SKELETON",
  legacyIntegrationMode: "READ_ONLY",
};

export function App() {
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
        <AuthenticationTestPanel />
      </section>
    </main>
  );
}
