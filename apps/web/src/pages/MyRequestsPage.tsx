import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { myRequests, type RequestRow } from "../portal/mockData.js";

const columns: readonly DataTableColumn<RequestRow>[] = [
  {
    key: "request",
    header: "Request Number",
    render: (row) => <strong className="table-primary">{row.requestNumber}</strong>,
  },
  { key: "target", header: "Target User", render: (row) => row.targetUser },
  { key: "system", header: "System", render: (row) => row.system },
  {
    key: "type",
    header: "Request Type",
    render: (row) => <StatusBadge tone="info">{row.requestType}</StatusBadge>,
  },
  { key: "role", header: "Role", render: (row) => row.role },
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

export function MyRequestsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [requestType, setRequestType] = useState("ALL");

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return myRequests.filter(
      (request) =>
        (!query ||
          request.requestNumber.toLowerCase().includes(query) ||
          request.targetUser.toLowerCase().includes(query) ||
          request.system.toLowerCase().includes(query)) &&
        (status === "ALL" || request.status === status) &&
        (requestType === "ALL" || request.requestType === requestType),
    );
  }, [requestType, search, status]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Requests"
        title="My Requests"
        description="Review local request examples. Request submission is not implemented."
        actions={<StatusBadge tone="neutral">Mock data</StatusBadge>}
      />

      <section className="panel" aria-labelledby="request-list-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Request history</p>
            <h2 id="request-list-title">Access requests</h2>
          </div>
          <span className="panel-meta">{filteredRequests.length} results</span>
        </div>
        <div className="filters">
          <label className="field field--search">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Request, user, or system"
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="Pending approval">Pending approval</option>
              <option value="In progress">In progress</option>
              <option value="Completed">Completed</option>
              <option value="Draft">Draft</option>
            </select>
          </label>
          <label className="field">
            <span>Request type</span>
            <select
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
            >
              <option value="ALL">All types</option>
              <option value="ADD">Add</option>
              <option value="CHANGE">Change</option>
              <option value="REMOVE">Remove</option>
            </select>
          </label>
        </div>
        <DataTable
          caption="My request examples"
          columns={columns}
          rows={filteredRequests}
          rowKey={(row) => row.requestNumber}
          emptyMessage="No mock requests match these filters."
        />
      </section>
    </div>
  );
}
