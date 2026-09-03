import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { legacyRequests } from "../portal/mockData.js";

type LegacyRow = (typeof legacyRequests)[number];

const columns: readonly DataTableColumn<LegacyRow>[] = [
  {
    key: "id",
    header: "Legacy ID",
    render: (row) => <strong className="table-primary">{row.legacyId}</strong>,
  },
  { key: "created", header: "Created", render: (row) => row.created },
  { key: "employee", header: "Employee", render: (row) => row.employee },
  { key: "department", header: "Department", render: (row) => row.department },
  { key: "type", header: "Request Type", render: (row) => row.requestType },
  {
    key: "manager",
    header: "Manager Status",
    render: (row) => (
      <StatusBadge tone={row.managerStatus === "Approved" ? "success" : "warning"}>
        {row.managerStatus}
      </StatusBadge>
    ),
  },
  { key: "work", header: "Work ID", render: (row) => row.workId },
  {
    key: "vsts",
    header: "VSTS Status",
    render: (row) => <StatusBadge tone="info">{row.vstsStatus}</StatusBadge>,
  },
];

export function LegacyRequestsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Legacy reference"
        title="Legacy Requests"
        description="A future read-only view for legacy User Request records."
        actions={<StatusBadge tone="info">Read only</StatusBadge>}
      />
      <aside className="safety-banner safety-banner--info">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Legacy data integration not connected</strong>
          <p>
            The rows below are synthetic examples and do not come from SharePoint,
            legacy SQL, or Azure DevOps.
          </p>
        </div>
      </aside>
      <section className="panel" aria-labelledby="legacy-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Local mock data</p>
            <h2 id="legacy-title">Legacy request preview</h2>
          </div>
          <span className="panel-meta">Future source: read only</span>
        </div>
        <DataTable
          caption="Synthetic legacy request examples"
          columns={columns}
          rows={legacyRequests}
          rowKey={(row) => row.legacyId}
        />
      </section>
    </div>
  );
}
