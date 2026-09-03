import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { auditEvents } from "../portal/mockData.js";

type AuditRow = (typeof auditEvents)[number];

const columns: readonly DataTableColumn<AuditRow>[] = [
  { key: "time", header: "Timestamp", render: (row) => row.timestamp },
  { key: "actor", header: "Actor", render: (row) => row.actor },
  { key: "target", header: "Target", render: (row) => row.target },
  {
    key: "action",
    header: "Action",
    render: (row) => <strong className="table-primary">{row.action}</strong>,
  },
  { key: "system", header: "System", render: (row) => row.system },
  {
    key: "result",
    header: "Result",
    render: (row) => <StatusBadge tone="success">{row.result}</StatusBadge>,
  },
  {
    key: "correlation",
    header: "Correlation ID",
    render: (row) => <code>{row.correlationId}</code>,
  },
];

export function AuditLogsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Governance"
        title="Audit Logs"
        description="Append-oriented event examples for future security and operational review."
        actions={<StatusBadge tone="neutral">Mock events</StatusBadge>}
      />
      <section className="panel" aria-labelledby="audit-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Local mock data</p>
            <h2 id="audit-title">Recent events</h2>
          </div>
          <span className="panel-meta">No production events</span>
        </div>
        <DataTable
          caption="Synthetic audit log events"
          columns={columns}
          rows={auditEvents}
          rowKey={(row) => row.correlationId}
        />
      </section>
    </div>
  );
}
