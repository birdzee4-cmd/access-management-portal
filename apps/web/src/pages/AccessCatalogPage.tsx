import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge, type StatusTone } from "../components/StatusBadge.js";
import { catalogEntries } from "../portal/mockData.js";

type CatalogRow = (typeof catalogEntries)[number];

function riskTone(risk: CatalogRow["risk"]): StatusTone {
  return risk === "High" ? "danger" : risk === "Medium" ? "warning" : "success";
}

const columns: readonly DataTableColumn<CatalogRow>[] = [
  {
    key: "system",
    header: "System",
    render: (row) => <strong className="table-primary">{row.system}</strong>,
  },
  { key: "application", header: "Application", render: (row) => row.application },
  { key: "role", header: "Role", render: (row) => row.role },
  { key: "description", header: "Description", render: (row) => row.description },
  {
    key: "risk",
    header: "Risk",
    render: (row) => <StatusBadge tone={riskTone(row.risk)}>{row.risk}</StatusBadge>,
  },
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

export function AccessCatalogPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Role & access catalog"
        title="Access Catalog"
        description="Explore normalized system and role examples for the future request experience."
        actions={<StatusBadge tone="neutral">View only</StatusBadge>}
      />
      <section className="panel" aria-labelledby="catalog-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Local mock data</p>
            <h2 id="catalog-title">Catalog entries</h2>
          </div>
          <span className="panel-meta">No editing available</span>
        </div>
        <DataTable
          caption="Access catalog examples"
          columns={columns}
          rows={catalogEntries}
          rowKey={(row) => row.system + row.application + row.role}
        />
      </section>
    </div>
  );
}
