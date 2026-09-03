import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { IntegrationStatus } from "../components/IntegrationStatus.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatCard } from "../components/StatCard.js";
import { StatusBadge } from "../components/StatusBadge.js";
import {
  myRequests,
  pendingApprovals,
  type ApprovalRow,
  type RequestRow,
} from "../portal/mockData.js";

const recentRequestColumns: readonly DataTableColumn<RequestRow>[] = [
  {
    key: "request",
    header: "Request",
    render: (row) => <strong className="table-primary">{row.requestNumber}</strong>,
  },
  { key: "user", header: "User", render: (row) => row.targetUser },
  { key: "system", header: "System", render: (row) => row.system },
  { key: "access", header: "Access", render: (row) => row.role },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge
        tone={
          row.status === "Completed"
            ? "success"
            : row.status === "Draft"
              ? "neutral"
              : "warning"
        }
      >
        {row.status}
      </StatusBadge>
    ),
  },
  { key: "created", header: "Created", render: (row) => row.created },
];

const approvalColumns: readonly DataTableColumn<ApprovalRow>[] = [
  {
    key: "request",
    header: "Request",
    render: (row) => <strong className="table-primary">{row.request}</strong>,
  },
  { key: "target", header: "Target user", render: (row) => row.targetUser },
  { key: "system", header: "System", render: (row) => row.system },
  { key: "role", header: "Role", render: (row) => row.role },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge tone="warning">{row.status}</StatusBadge>,
  },
];

export function DashboardPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A local pilot view of access activity and integration readiness."
        actions={<StatusBadge tone="warning">Local pilot</StatusBadge>}
      />

      <section className="stat-grid" aria-label="Access management summary">
        <StatCard label="My Requests" value="4" detail="1 awaiting approval" />
        <StatCard
          label="Pending Approvals"
          value="3"
          detail="Mock approval queue"
          tone="amber"
        />
        <StatCard
          label="Open Legacy Cases"
          value="6"
          detail="Integration not connected"
          tone="slate"
        />
        <StatCard
          label="Systems"
          value="3"
          detail="Draft catalog entries"
          tone="green"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel dashboard-grid__wide" aria-labelledby="recent-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Local mock data</p>
              <h2 id="recent-title">Recent requests</h2>
            </div>
            <span className="panel-meta">Last 30 days</span>
          </div>
          <DataTable
            caption="Recent access requests"
            columns={recentRequestColumns}
            rows={myRequests}
            rowKey={(row) => row.requestNumber}
          />
        </section>

        <section className="panel" aria-labelledby="integration-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Safety boundary</p>
              <h2 id="integration-title">Integration status</h2>
            </div>
          </div>
          <ul className="integration-list">
            <IntegrationStatus
              name="New Portal Database"
              description="Dedicated portal store"
              status="Not connected"
              tone="neutral"
            />
            <IntegrationStatus
              name="Legacy SQL"
              description="Read only boundary"
              status="Not connected"
              tone="info"
            />
            <IntegrationStatus
              name="SharePoint"
              description="Read only boundary"
              status="Not connected"
              tone="info"
            />
            <IntegrationStatus
              name="Azure DevOps / VSTS"
              description="Read only boundary"
              status="Not connected"
              tone="info"
            />
            <IntegrationStatus
              name="Automation"
              description="Execution prohibited"
              status="Disabled"
              tone="danger"
            />
          </ul>
        </section>

        <section className="panel dashboard-grid__wide" aria-labelledby="approval-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Local mock data</p>
              <h2 id="approval-title">Pending approvals</h2>
            </div>
            <StatusBadge tone="warning">No actions enabled</StatusBadge>
          </div>
          <DataTable
            caption="Pending approval examples"
            columns={approvalColumns}
            rows={pendingApprovals}
            rowKey={(row) => row.request}
          />
        </section>
      </div>
    </div>
  );
}
