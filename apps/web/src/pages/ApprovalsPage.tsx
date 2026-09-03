import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { pendingApprovals, type ApprovalRow } from "../portal/mockData.js";

const columns: readonly DataTableColumn<ApprovalRow>[] = [
  {
    key: "request",
    header: "Request",
    render: (row) => <strong className="table-primary">{row.request}</strong>,
  },
  { key: "requester", header: "Requester", render: (row) => row.requester },
  { key: "target", header: "Target User", render: (row) => row.targetUser },
  { key: "system", header: "System", render: (row) => row.system },
  { key: "role", header: "Role", render: (row) => row.role },
  { key: "action", header: "Requested Action", render: (row) => row.action },
  { key: "date", header: "Requested Date", render: (row) => row.requestedDate },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge tone="warning">{row.status}</StatusBadge>,
  },
];

export function ApprovalsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Approval workspace"
        title="Approvals"
        description="Preview future approval queues. Decision actions are intentionally unavailable."
        actions={<StatusBadge tone="warning">Actions disabled</StatusBadge>}
      />
      <section className="panel" aria-labelledby="approvals-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Local mock data</p>
            <h2 id="approvals-title">Pending approvals</h2>
          </div>
          <span className="panel-meta">{pendingApprovals.length} examples</span>
        </div>
        <DataTable
          caption="Pending approval examples"
          columns={columns}
          rows={pendingApprovals}
          rowKey={(row) => row.request}
        />
      </section>
    </div>
  );
}
