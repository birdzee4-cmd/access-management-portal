import type { ProductManagementRequest } from "@access-portal/contracts";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import type { ProductManagementApiClient } from "../requests/productManagementApi.js";

const columns: readonly DataTableColumn<ProductManagementRequest>[] = [
  { key: "id", header: "Request ID", render: (row) => <strong className="table-primary">{row.requestId}</strong> },
  { key: "country", header: "Country", render: (row) => row.country },
  { key: "topic", header: "Topic", render: (row) => row.topic },
  { key: "requester", header: "Requester", render: (row) => row.requester },
  { key: "created", header: "Created Date", render: (row) => new Date(row.createdDate).toLocaleDateString() },
  { key: "status", header: "Status", render: (row) => <StatusBadge tone="warning">{row.status}</StatusBadge> },
  { key: "work", header: "Work ID", render: (row) => row.workId ?? "—" },
];

export function ProductManagementRequestsPage({ api }: { readonly api: Pick<ProductManagementApiClient, "list"> }) {
  const [requests, setRequests] = useState<readonly ProductManagementRequest[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => { let active = true; api.list().then((value) => { if (active) setRequests(value.requests); }).catch(() => { if (active) setError(true); }); return () => { active = false; }; }, [api]);
  return <div className="page"><PageHeader eyebrow="Product Management" title="My Requests" description="Product Management MVP request history. This page uses mock API data; no production workflow is contacted." actions={<Link className="button button--primary" to="/requests/new">New Request</Link>} />
    <section className="panel" aria-labelledby="request-history"><div className="panel-heading"><div><p className="panel-kicker">Mock data</p><h2 id="request-history">Request history</h2></div><StatusBadge tone="info">No production write</StatusBadge></div>
      {error ? <p className="legacy-list__state" role="alert">Product Management request history is unavailable.</p> : <DataTable caption="Product Management request history" rowKey={(row) => row.id} columns={columns} rows={requests} emptyMessage="No Product Management requests found." />}
    </section></div>;
}
