import type { PortalAccessRequest, PortalCatalogRole, PortalRequestType } from "@access-portal/contracts";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import type { PortalRequestApiClient } from "../requests/portalRequestApi.js";
import { emptyRequestDraft, toSubmission, validateDraft, type RequestDraft } from "../requests/model.js";

type Api = Pick<PortalRequestApiClient, "catalog" | "list" | "submit">;
const columns: readonly DataTableColumn<PortalAccessRequest>[] = [
  { key: "number", header: "Request", render: (row) => <strong className="table-primary">{row.requestNumber}</strong> },
  { key: "type", header: "Type", render: (row) => <StatusBadge tone="info">{row.requestType}</StatusBadge> },
  { key: "current", header: "Current role", render: (row) => row.item.currentRole ? `${row.item.currentRole.systemName} · ${row.item.currentRole.name}` : "—" },
  { key: "requested", header: "Requested role", render: (row) => row.item.requestedRole ? `${row.item.requestedRole.systemName} · ${row.item.requestedRole.name}` : "—" },
  { key: "status", header: "Status", render: (row) => <StatusBadge tone="warning">{row.status}</StatusBadge> },
  { key: "date", header: "Submitted", render: (row) => new Date(row.submittedAt).toLocaleString() },
];
const roleLabel = (role: PortalCatalogRole) => `${role.systemName} · ${role.name}${role.contextName ? ` · ${role.contextName}` : ""}`;

export function MyRequestsPage({ api }: { readonly api: Api }) {
  const [roles, setRoles] = useState<readonly PortalCatalogRole[]>([]);
  const [requests, setRequests] = useState<readonly PortalAccessRequest[]>([]);
  const [draft, setDraft] = useState<RequestDraft>(emptyRequestDraft);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let active = true;
    Promise.all([api.catalog(), api.list()]).then(([catalog, list]) => {
      if (active) { setRoles(catalog.roles); setRequests(list.requests); setState("ready"); }
    }).catch(() => { if (active) { setMessage("Portal request data is unavailable. No request was submitted."); setState("error"); } });
    return () => { active = false; };
  }, [api]);
  const errors = useMemo(() => validateDraft(draft, roles), [draft, roles]);
  const change = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const changeType = (requestType: PortalRequestType) => setDraft({ ...emptyRequestDraft, requestType });
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage("");
    if (errors.length) { setMessage(errors.join(" ")); return; }
    setState("saving");
    try {
      const result = await api.submit(toSubmission(draft, idempotencyKey));
      const list = await api.list(); setRequests(list.requests); setDraft(emptyRequestDraft);
      setIdempotencyKey(crypto.randomUUID()); setMessage(result.replayed ? "The earlier submission was safely returned." : `Request ${result.request.requestNumber} submitted.`); setState("ready");
    } catch { setMessage("Submission failed safely. Retry keeps the same idempotency key."); setState("error"); }
  };
  return <div className="page">
    <PageHeader eyebrow="Portal requests" title="My Requests" description="Submit and track your own Portal-native request. Submission does not approve, activate, provision, revoke, or contact Legacy Production." actions={<StatusBadge tone="info">Self-service</StatusBadge>} />
    <section className="panel request-form" aria-labelledby="new-request-title">
      <div className="panel-heading"><div><p className="panel-kicker">New request</p><h2 id="new-request-title">Request access intent</h2></div><StatusBadge tone="warning">Stops at SUBMITTED</StatusBadge></div>
      <form onSubmit={(event) => void submit(event)}>
        <div className="request-form__grid">
          <label className="field"><span>Request type</span><select value={draft.requestType} onChange={(event) => changeType(event.target.value as PortalRequestType)}><option value="ADD">Add access</option><option value="REMOVE">Remove access</option><option value="CHANGE">Change access</option></select></label>
          {draft.requestType !== "ADD" ? <label className="field"><span>Current Portal catalog role</span><select value={draft.currentRoleId} onChange={(event) => change("currentRoleId", event.target.value)}><option value="">Choose a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role)}</option>)}</select></label> : null}
          {draft.requestType !== "REMOVE" ? <label className="field"><span>Requested Portal catalog role</span><select value={draft.requestedRoleId} onChange={(event) => change("requestedRoleId", event.target.value)}><option value="">Choose a role</option>{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role)}</option>)}</select></label> : null}
          <label className="field"><span>Effective date (optional)</span><input type="date" value={draft.effectiveDate} onChange={(event) => change("effectiveDate", event.target.value)} /></label>
          <label className="field"><span>Expiration date (optional)</span><input type="date" value={draft.expirationDate} onChange={(event) => change("expirationDate", event.target.value)} /></label>
          <label className="field request-form__reason"><span>Business reason</span><textarea value={draft.reason} maxLength={1000} onChange={(event) => change("reason", event.target.value)} placeholder="Describe why this access intent is needed (10–1000 characters)." /></label>
        </div>
        <p className="request-form__policy">REMOVE and CHANGE record your stated current role; M1 does not verify target-system access or execute removal. Requests for another person remain POLICY REQUIRED and are blocked.</p>
        {message ? <p role={state === "error" ? "alert" : "status"} className="request-form__message">{message}</p> : null}
        <button className="button button--primary" disabled={state === "loading" || state === "saving" || roles.length === 0} type="submit">{state === "saving" ? "Submitting…" : "Submit request"}</button>
      </form>
    </section>
    <section className="panel" aria-labelledby="request-list-title">
      <div className="panel-heading"><div><p className="panel-kicker">Portal-owned history</p><h2 id="request-list-title">Submitted requests</h2></div><span className="panel-meta">{requests.length} requests</span></div>
      <DataTable caption="My Portal requests" columns={columns} rows={requests} rowKey={(row) => row.id} emptyMessage={state === "loading" ? "Loading requests…" : "No Portal requests submitted yet."} />
    </section>
  </div>;
}
