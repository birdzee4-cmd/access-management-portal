import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { automationJobs } from "../portal/mockData.js";

type AutomationRow = (typeof automationJobs)[number];

const columns: readonly DataTableColumn<AutomationRow>[] = [
  {
    key: "job",
    header: "Job",
    render: (row) => <strong className="table-primary">{row.job}</strong>,
  },
  { key: "request", header: "Request", render: (row) => row.request },
  { key: "connector", header: "Connector", render: (row) => row.connector },
  { key: "operation", header: "Operation", render: (row) => row.operation },
  {
    key: "status",
    header: "Status",
    render: (row) => <StatusBadge tone="danger">{row.status}</StatusBadge>,
  },
  { key: "attempts", header: "Attempts", render: (row) => row.attempts },
  { key: "updated", header: "Last Updated", render: (row) => row.updated },
];

export function AutomationJobsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Automation Jobs"
        description="Reserved for future connector execution and verification activity."
        actions={<StatusBadge tone="danger">Automation disabled</StatusBadge>}
      />
      <aside className="safety-banner safety-banner--danger">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Automation Disabled</strong>
          <p>
            No connector can provision, revoke, update, or verify access in this phase.
          </p>
        </div>
      </aside>
      <section className="panel" aria-labelledby="jobs-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Illustrative record only</p>
            <h2 id="jobs-title">Job activity</h2>
          </div>
          <span className="panel-meta">No execution available</span>
        </div>
        <DataTable
          caption="Disabled automation job example"
          columns={columns}
          rows={automationJobs}
          rowKey={(row) => row.job}
        />
      </section>
    </div>
  );
}
