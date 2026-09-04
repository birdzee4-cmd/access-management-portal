import type {
  LegacyLifecycleStage,
  LegacyStatusComparison,
  LegacyUserRequestDetail,
} from "@access-portal/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { AuthApiError } from "../auth/authApi.js";
import type { PortalRole } from "../auth/types.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge, type StatusTone } from "../components/StatusBadge.js";

const MAX_SQL_INT = 2_147_483_647n;

export interface LegacyUserRequestDetailApi {
  getLegacyUserRequestDetail(
    idSharepoint: string,
  ): Promise<LegacyUserRequestDetail>;
}

export type LegacyUserRequestDetailViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "invalid" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "not-found" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "error" }
  | { readonly kind: "success"; readonly detail: LegacyUserRequestDetail };

export function canViewLegacyUserRequestDetail(
  roles: readonly PortalRole[],
): boolean {
  return roles.includes("Admin");
}

export function normalizeLegacyRequestRouteId(
  value: string | undefined,
): string | null {
  if (!value || !/^[0-9]+$/.test(value)) return null;
  const numeric = BigInt(value);
  if (numeric < 1n || numeric > MAX_SQL_INT) return null;
  return numeric.toString();
}

export async function loadLegacyUserRequestDetailForRoles(
  api: LegacyUserRequestDetailApi,
  roles: readonly PortalRole[],
  routeId: string | undefined,
): Promise<LegacyUserRequestDetail | null> {
  if (!canViewLegacyUserRequestDetail(roles)) return null;
  const normalizedId = normalizeLegacyRequestRouteId(routeId);
  if (!normalizedId) throw new AuthApiError(400);
  return api.getLegacyUserRequestDetail(normalizedId);
}

export function legacyUserRequestDetailErrorState(
  error: unknown,
): LegacyUserRequestDetailViewState {
  if (error instanceof AuthApiError) {
    if (error.status === 400) return { kind: "invalid" };
    if (error.status === 401) return { kind: "unauthorized" };
    if (error.status === 403) return { kind: "forbidden" };
    if (error.status === 404) return { kind: "not-found" };
    if (error.status === 409) return { kind: "duplicate" };
    if (error.status === 503) return { kind: "unavailable" };
  }
  return { kind: "error" };
}

function comparisonTone(comparison: LegacyStatusComparison): StatusTone {
  if (comparison === "MATCH") return "info";
  if (comparison === "MISMATCH") return "warning";
  return "neutral";
}

function observedValue(value: string | null): string {
  return value ?? "Unavailable";
}

function DetailHeader({
  loading,
  onBack,
  onRefresh,
}: {
  readonly loading: boolean;
  readonly onBack: () => void;
  readonly onRefresh: () => void;
}) {
  return (
    <PageHeader
      eyebrow="Legacy source observation"
      title="Legacy User Request"
      description="Diagnostic visibility into one legacy request and its related VSTS backup observations."
      actions={
        <div className="legacy-detail__header-actions">
          <StatusBadge tone="warning">READ ONLY</StatusBadge>
          <StatusBadge tone="neutral">LEGACY DATA</StatusBadge>
          <button className="button button--secondary button--compact" type="button" onClick={onBack}>
            Back
          </button>
          <button
            className="button button--primary button--compact"
            type="button"
            disabled={loading}
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
      }
    />
  );
}

const stateMessages: Readonly<
  Record<
    Exclude<LegacyUserRequestDetailViewState["kind"], "loading" | "success">,
    { readonly title: string; readonly description: string }
  >
> = {
  invalid: {
    title: "Invalid legacy request identifier",
    description: "Use a positive numeric legacy request identifier.",
  },
  unauthorized: {
    title: "Authentication required",
    description: "The Portal could not authenticate this detail request.",
  },
  forbidden: {
    title: "Administrator access required",
    description: "Your current Portal role cannot view legacy request detail.",
  },
  "not-found": {
    title: "Legacy request not found",
    description: "No legacy request was found for this identifier.",
  },
  duplicate: {
    title: "Ambiguous legacy request",
    description:
      "Multiple legacy records were found for this identifier. The Portal stopped to avoid displaying an ambiguous request.",
  },
  unavailable: {
    title: "Legacy data unavailable",
    description: "The read-only legacy data source is currently unavailable.",
  },
  error: {
    title: "Unable to display legacy request",
    description: "The request could not be displayed. No source system was modified.",
  },
};

function DetailStateMessage({
  state,
}: {
  readonly state: Exclude<
    LegacyUserRequestDetailViewState,
    { readonly kind: "loading" } | { readonly kind: "success" }
  >;
}) {
  const message = stateMessages[state.kind];
  return (
    <section className="panel legacy-detail__state" aria-live="polite">
      <span aria-hidden="true">{state.kind === "duplicate" ? "!" : "○"}</span>
      <h2>{message.title}</h2>
      <p>{message.description}</p>
    </section>
  );
}

function ObservationRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null;
}) {
  const available = value !== null;
  return (
    <div className="legacy-observation-row">
      <div>
        <strong>{label}</strong>
        <small>{available ? "Observed value" : "No source value was available"}</small>
      </div>
      <StatusBadge tone={available ? "info" : "neutral"}>
        {available ? "OBSERVED" : "UNAVAILABLE"}
      </StatusBadge>
      <span className="legacy-observation-row__value">{observedValue(value)}</span>
    </div>
  );
}

const lifecycleLabels: Readonly<Record<LegacyLifecycleStage["code"], string>> = {
  REQUEST_CREATED: "Request created observation",
  LINE_MANAGER_APPROVAL: "Line Manager observation",
  CEO_APPROVAL: "CEO observation",
  IT_MANAGER_APPROVAL: "IT Manager observation",
  VSTS_WORK_ITEM: "VSTS Work Item observation",
  VSTS_STATE: "VSTS State observation",
  REQUEST_UPDATED: "Request updated observation",
};

function LifecycleObservation({ stage }: { readonly stage: LegacyLifecycleStage }) {
  return (
    <li className="legacy-lifecycle__item">
      <div className="legacy-lifecycle__heading">
        <strong>{lifecycleLabels[stage.code]}</strong>
        <StatusBadge tone={stage.availability === "OBSERVED" ? "info" : "neutral"}>
          {stage.availability}
        </StatusBadge>
      </div>
      {stage.value ? <p>Source value: {stage.value}</p> : null}
      {stage.dateText ? (
        <p>
          Source date text: {stage.dateText}
          <small>Timezone not determined by the Portal</small>
        </p>
      ) : null}
      {stage.relatedItemCount !== null ? (
        <p>Related item count: {stage.relatedItemCount}</p>
      ) : null}
      {!stage.value && !stage.dateText && stage.relatedItemCount === null ? (
        <p>No source value was available.</p>
      ) : null}
    </li>
  );
}

type RelatedItemRow = LegacyUserRequestDetail["relatedVstsItems"][number] & {
  readonly rowKey: string;
};

const relatedItemColumns: readonly DataTableColumn<RelatedItemRow>[] = [
  {
    key: "work-id",
    header: "Work ID",
    render: (row) => <strong className="table-primary">{observedValue(row.workItemId)}</strong>,
  },
  { key: "state", header: "State", render: (row) => observedValue(row.state) },
  {
    key: "comparison",
    header: "Status comparison",
    render: (row) => (
      <StatusBadge tone={comparisonTone(row.statusComparison)}>
        {row.statusComparison}
      </StatusBadge>
    ),
  },
];

export interface LegacyUserRequestDetailViewProps {
  readonly state: LegacyUserRequestDetailViewState;
  readonly onBack: () => void;
  readonly onRefresh: () => void;
}

export function LegacyUserRequestDetailView({
  state,
  onBack,
  onRefresh,
}: LegacyUserRequestDetailViewProps) {
  const loading = state.kind === "loading";
  if (state.kind !== "success") {
    return (
      <div className="page legacy-detail">
        <DetailHeader loading={loading} onBack={onBack} onRefresh={onRefresh} />
        {loading ? (
          <section className="panel legacy-detail__state" aria-live="polite">
            <span className="legacy-detail__spinner" aria-hidden="true" />
            <h2>Loading legacy request</h2>
            <p>Reading bounded observations from the legacy detail API.</p>
          </section>
        ) : (
          <DetailStateMessage state={state} />
        )}
      </div>
    );
  }

  const detail = state.detail;
  const relatedRows: readonly RelatedItemRow[] = detail.relatedVstsItems.map(
    (item, index) => ({ ...item, rowKey: "related-item-" + index }),
  );
  const multipleItems = detail.relationship.sourceRowCount > 1;

  return (
    <div className="page legacy-detail">
      <DetailHeader loading={false} onBack={onBack} onRefresh={onRefresh} />

      <aside className="safety-banner safety-banner--info" role="note">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Source observations only</strong>
          <p>
            This page displays observed values from the existing User Request and VSTS backup data. It does not determine the authoritative business workflow or modify the source systems.
          </p>
        </div>
      </aside>

      <section className="panel legacy-detail__section" aria-labelledby="request-summary-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Safe detail DTO</p>
            <h2 id="request-summary-title">Request information</h2>
          </div>
          <span className="panel-meta">Legacy data</span>
        </div>
        <dl className="legacy-detail__summary-grid">
          <div><dt>Legacy Request ID</dt><dd>{detail.externalRequestId}</dd></div>
          <div><dt>Company</dt><dd>{observedValue(detail.company)}</dd></div>
          <div><dt>Department</dt><dd>{observedValue(detail.department)}</dd></div>
          <div><dt>Country</dt><dd>{observedValue(detail.country)}</dd></div>
          <div><dt>System</dt><dd>{observedValue(detail.system)}</dd></div>
          <div><dt>Permission</dt><dd>{observedValue(detail.permission)}</dd></div>
          <div className="legacy-detail__date"><dt>Created</dt><dd>{observedValue(detail.createdDateText)}<small>Source text · timezone unknown</small></dd></div>
          <div className="legacy-detail__date"><dt>Updated</dt><dd>{observedValue(detail.updatedDateText)}<small>Source text · timezone unknown</small></dd></div>
        </dl>
      </section>

      <div className="legacy-detail__two-column">
        <section className="panel legacy-detail__section" aria-labelledby="approval-observations-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Independent source fields</p>
              <h2 id="approval-observations-title">Approval observations</h2>
            </div>
          </div>
          <div className="legacy-observation-list">
            <ObservationRow label="Line Manager" value={detail.workflow.lineManagerApprovalStatus} />
            <ObservationRow label="CEO" value={detail.workflow.ceoApprovalStatus} />
            <ObservationRow label="IT Manager" value={detail.workflow.itManagerApprovalStatus} />
          </div>
        </section>

        <section className="panel legacy-detail__section" aria-labelledby="status-observations-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Legacy processing fields</p>
              <h2 id="status-observations-title">Legacy status observations</h2>
            </div>
          </div>
          <div className="legacy-observation-list">
            <ObservationRow label="Legacy OpenCase value" value={detail.workflow.openCaseStatus} />
            <ObservationRow label="SharePoint-side VSTS status" value={detail.workflow.vstsStatus} />
          </div>
          <div className="legacy-detail__comparison">
            <span>Observed status comparison</span>
            <StatusBadge tone={comparisonTone(detail.workflow.statusComparison)}>
              {detail.workflow.statusComparison}
            </StatusBadge>
            <p>
              MATCH means only that the observed source values are consistent under the existing comparison logic.
            </p>
            {detail.workflow.statusComparison === "MISMATCH" ? (
              <p className="legacy-detail__comparison-note">
                The source values differ. No reconciliation is performed by this Portal.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel legacy-detail__section" aria-labelledby="related-vsts-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">All bounded related rows</p>
            <h2 id="related-vsts-title">Related VSTS Work Items</h2>
          </div>
          <span className="panel-meta">
            {detail.relationship.returnedRowCount} of {detail.relationship.sourceRowCount} rows
          </span>
        </div>
        {multipleItems ? (
          <p className="legacy-detail__notice" role="note">
            Multiple related VSTS items were observed for this legacy request. No primary item is selected.
          </p>
        ) : null}
        {detail.relationship.truncated ? (
          <p className="legacy-detail__notice legacy-detail__notice--warning" role="note">
            This result is bounded. Additional related VSTS items may exist.
          </p>
        ) : null}
        <DataTable
          caption="Related VSTS Work Item source observations"
          columns={relatedItemColumns}
          rows={relatedRows}
          rowKey={(row) => row.rowKey}
          emptyMessage="No related VSTS items were observed."
        />
      </section>

      <section className="panel legacy-detail__section" aria-labelledby="lifecycle-observations-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Descriptive, not sequential</p>
            <h2 id="lifecycle-observations-title">Lifecycle observations</h2>
          </div>
          <span className="panel-meta">No mandatory order inferred</span>
        </div>
        <ul className="legacy-lifecycle" aria-label="Legacy lifecycle source observations">
          {detail.lifecycle.map((stage) => (
            <LifecycleObservation key={stage.code} stage={stage} />
          ))}
        </ul>
      </section>

      <aside className="safety-banner safety-banner--warning" role="note">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Read-only legacy boundary</strong>
          <p>
            Refresh only repeats the authenticated GET request. The Portal does not edit, synchronize, reconcile, provision, revoke, or close anything shown here.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function LegacyUserRequestDetailPage({
  roles,
  api,
}: {
  readonly roles: readonly PortalRole[];
  readonly api: LegacyUserRequestDetailApi;
}) {
  const { idSharepoint } = useParams<{ idSharepoint: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LegacyUserRequestDetailViewState>({
    kind: "loading",
  });

  useEffect(() => {
    let active = true;
    if (!canViewLegacyUserRequestDetail(roles)) {
      setState({ kind: "forbidden" });
      return () => {
        active = false;
      };
    }

    const normalizedId = normalizeLegacyRequestRouteId(idSharepoint);
    if (!normalizedId) {
      setState({ kind: "invalid" });
      return () => {
        active = false;
      };
    }

    setState({ kind: "loading" });
    api
      .getLegacyUserRequestDetail(normalizedId)
      .then((detail) => {
        if (active) setState({ kind: "success", detail });
      })
      .catch((error: unknown) => {
        if (active) setState(legacyUserRequestDetailErrorState(error));
      });

    return () => {
      active = false;
    };
  }, [api, attempt, idSharepoint, roles]);

  return (
    <LegacyUserRequestDetailView
      state={state}
      onBack={() => navigate("/legacy-requests")}
      onRefresh={() => setAttempt((value) => value + 1)}
    />
  );
}
