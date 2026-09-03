import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";

const safetySettings = [
  ["Legacy Integration Mode", "READ_ONLY", "info"],
  ["SharePoint Write", "Disabled", "success"],
  ["Legacy SQL Write", "Disabled", "success"],
  ["VSTS Write", "Disabled", "success"],
  ["Provisioning", "Disabled", "success"],
  ["Revocation", "Disabled", "success"],
  ["Automation", "Disabled", "success"],
] as const;

export function SettingsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Read-only visibility of mandatory local pilot safety controls."
        actions={<StatusBadge tone="neutral">No controls available</StatusBadge>}
      />
      <aside className="safety-banner">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Production Safety Boundary enforced</strong>
          <p>
            These values are informational. Task 06 provides no UI control that can
            change them.
          </p>
        </div>
      </aside>
      <section className="panel settings-panel" aria-labelledby="safety-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Read-only configuration</p>
            <h2 id="safety-title">Safety status</h2>
          </div>
        </div>
        <dl className="settings-list">
          {safetySettings.map(([label, value, tone]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <StatusBadge tone={tone}>{value}</StatusBadge>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
