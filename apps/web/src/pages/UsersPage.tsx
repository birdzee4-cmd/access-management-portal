import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { fakeUsers } from "../portal/mockData.js";

type UserRow = (typeof fakeUsers)[number];

const columns: readonly DataTableColumn<UserRow>[] = [
  {
    key: "employee",
    header: "Employee",
    render: (row) => <strong className="table-primary">{row.employee}</strong>,
  },
  { key: "email", header: "Email", render: (row) => row.email },
  { key: "department", header: "Department", render: (row) => row.department },
  { key: "manager", header: "Manager", render: (row) => row.manager },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge tone={row.status === "Active" ? "success" : "neutral"}>
        {row.status}
      </StatusBadge>
    ),
  },
];

export function UsersPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Synthetic directory examples only. Microsoft Graph is not connected."
        actions={<StatusBadge tone="neutral">Admin view</StatusBadge>}
      />
      <section className="panel" aria-labelledby="users-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Local mock data</p>
            <h2 id="users-title">Portal users</h2>
          </div>
          <span className="panel-meta">No directory sync</span>
        </div>
        <DataTable
          caption="Synthetic portal users"
          columns={columns}
          rows={fakeUsers}
          rowKey={(row) => row.email}
        />
      </section>
    </div>
  );
}
