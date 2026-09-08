import type { PortalAccessRequest, PortalCatalogRole } from "@access-portal/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { PortalRequestApiError, type PortalRequestApiClient } from "../requests/portalRequestApi.js";

export interface PortalRequestDetailApi {
  detail(id: string): Promise<PortalAccessRequest>;
}

export type PortalRequestDetailViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not-found" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "error" }
  | { readonly kind: "success"; readonly detail: PortalAccessRequest };

export function normalizePortalRequestRouteId(value: string | undefined): string | null {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

export function portalRequestDetailErrorState(error: unknown): PortalRequestDetailViewState {
  if (error instanceof PortalRequestApiError) {
    if (error.status === 401) return { kind: "unauthorized" };
    if (error.status === 403) return { kind: "forbidden" };
    if (error.status === 404) return { kind: "not-found" };
    if (error.status === 503) return { kind: "unavailable" };
  }
  return { kind: "error" };
}

function roleLabel(role: PortalCatalogRole | null): string {
  return role ? `${role.systemName} · ${role.name}${role.contextName ? ` · ${role.contextName}` : ""}` : "—";
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString();
}

const stateMessages: Readonly<Record<Exclude<PortalRequestDetailViewState["kind"], "loading" | "success">, { readonly title: string; readonly description: string }>> = {
  invalid: { title: "Invalid request identifier", description: "Use a valid Portal request link from My Requests." },
  unauthorized: { title: "Authentication required", description: "The Portal could not authenticate this request. Sign in again and retry." },
  forbidden: { title: "Request unavailable", description: "This request cannot be displayed for the current Portal session." },
  "not-found": { title: "Request not found", description: "This Portal request was not found or is not available to you." },
  unavailable: { title: "Portal request data unavailable", description: "The Portal request service is temporarily unavailable. No request was changed." },
  error: { title: "Unable to display request", description: "The request could not be displayed. No request was changed." },
};

function DetailHeader({ loading, onBack, onRefresh }: { readonly loading: boolean; readonly onBack: () => void; readonly onRefresh: () => void }) {
  return <PageHeader eyebrow="Portal request" title="Request Detail" description="Your submitted Portal-native access intent. Viewing does not approve, activate, provision, revoke, or contact Legacy Production." actions={<div className="legacy-detail__header-actions"><StatusBadge tone="info">Self-service</StatusBadge><button className="button button--secondary button--compact" type="button" onClick={onBack}>Back</button><button className="button button--primary button--compact" type="button" disabled={loading} onClick={onRefresh}>Refresh</button></div>} />;
}

export function PortalRequestDetailView({ state, onBack, onRefresh }: { readonly state: PortalRequestDetailViewState; readonly onBack: () => void; readonly onRefresh: () => void }) {
  if (state.kind !== "success") {
    const loading = state.kind === "loading";
    const message = loading ? { title: "Loading request detail", description: "Loading your Portal-owned request." } : stateMessages[state.kind];
    return <div className="page legacy-detail"><DetailHeader loading={loading} onBack={onBack} onRefresh={onRefresh} /><section className="panel legacy-detail__state" aria-live="polite"><span className={loading ? "legacy-detail__spinner" : undefined} aria-hidden="true">{loading ? "" : "○"}</span><h2>{message.title}</h2><p>{message.description}</p></section></div>;
  }
  const { detail } = state;
  return <div className="page legacy-detail"><DetailHeader loading={false} onBack={onBack} onRefresh={onRefresh} />
    <aside className="safety-banner safety-banner--info" role="note"><span aria-hidden="true">i</span><div><strong>Submitted intent only</strong><p>SUBMITTED and PENDING record your request intent. They do not imply approval, active access, or provisioning.</p></div></aside>
    <section className="panel legacy-detail__section" aria-labelledby="portal-request-summary-title"><div className="panel-heading"><div><p className="panel-kicker">Portal-owned request</p><h2 id="portal-request-summary-title">Request information</h2></div><StatusBadge tone="warning">{detail.status}</StatusBadge></div><dl className="legacy-detail__summary-grid"><div><dt>Request number</dt><dd>{detail.requestNumber}</dd></div><div><dt>Request type</dt><dd><StatusBadge tone="info">{detail.requestType}</StatusBadge></dd></div><div><dt>Request status</dt><dd><StatusBadge tone="warning">{detail.status}</StatusBadge></dd></div><div><dt>Item status</dt><dd><StatusBadge tone="warning">{detail.item.status}</StatusBadge></dd></div><div><dt>Submitted</dt><dd>{dateTime(detail.submittedAt)}</dd></div><div><dt>Effective date</dt><dd>{detail.effectiveDate ?? "Not specified"}</dd></div><div><dt>Expiration date</dt><dd>{detail.expirationDate ?? "Not specified"}</dd></div><div><dt>Request version</dt><dd>{detail.version}</dd></div></dl></section>
    <section className="panel legacy-detail__section" aria-labelledby="portal-request-roles-title"><div className="panel-heading"><div><p className="panel-kicker">Immutable request snapshot</p><h2 id="portal-request-roles-title">Role information</h2></div></div><dl className="legacy-detail__summary-grid"><div><dt>Current role</dt><dd>{roleLabel(detail.item.currentRole)}</dd></div><div><dt>Requested role</dt><dd>{roleLabel(detail.item.requestedRole)}</dd></div></dl></section>
    <section className="panel legacy-detail__section" aria-labelledby="portal-request-reason-title"><div className="panel-heading"><div><p className="panel-kicker">Submission metadata</p><h2 id="portal-request-reason-title">Business reason</h2></div></div><p className="portal-request-detail__reason">{detail.reason}</p></section>
  </div>;
}

export function PortalRequestDetailPage({ api }: { readonly api: Pick<PortalRequestApiClient, "detail"> | PortalRequestDetailApi }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PortalRequestDetailViewState>({ kind: "loading" });
  useEffect(() => {
    let active = true;
    const normalizedId = normalizePortalRequestRouteId(id);
    if (!normalizedId) { setState({ kind: "invalid" }); return () => { active = false; }; }
    setState({ kind: "loading" });
    api.detail(normalizedId).then((detail) => { if (active) setState({ kind: "success", detail }); }).catch((error: unknown) => { if (active) setState(portalRequestDetailErrorState(error)); });
    return () => { active = false; };
  }, [api, attempt, id]);
  return <PortalRequestDetailView state={state} onBack={() => navigate("/requests")} onRefresh={() => setAttempt((value) => value + 1)} />;
}
