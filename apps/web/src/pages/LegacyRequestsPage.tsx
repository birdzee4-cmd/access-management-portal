import type {
  LegacyUserRequestListResponse,
  LegacyUserRequestSummary,
} from "@access-portal/contracts";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AuthApiError } from "../auth/authApi.js";
import type { PortalRole } from "../auth/types.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { normalizeLegacyRequestRouteId } from "./LegacyUserRequestDetailPage.js";

export const DEFAULT_LEGACY_REQUEST_LIST_LIMIT = 20;
export const MAX_LEGACY_REQUEST_LIST_LIMIT = 50;
export type LegacyRequestListLimit = 20 | 50;

export interface LegacyRequestListApi {
  getLegacyUserRequests(
    limit: LegacyRequestListLimit,
  ): Promise<LegacyUserRequestListResponse>;
}

export type LegacyRequestListViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "error" }
  | {
      readonly kind: "success";
      readonly response: LegacyUserRequestListResponse;
    };

type LegacyRequestTableRow = LegacyUserRequestSummary & {
  readonly rowKey: string;
};

function sourceText(value: string | null): string {
  return value ?? "Unavailable";
}

function detailRoute(externalRequestId: string | null): string | null {
  const normalizedId = normalizeLegacyRequestRouteId(
    externalRequestId ?? undefined,
  );
  return normalizedId ? "/legacy-requests/" + encodeURIComponent(normalizedId) : null;
}

const columns: readonly DataTableColumn<LegacyRequestTableRow>[] = [
  {
    key: "id",
    header: "Legacy Request ID",
    render: (row) => {
      const route = detailRoute(row.externalRequestId);
      return route ? (
        <Link className="legacy-list__detail-link" to={route}>
          {row.externalRequestId}
        </Link>
      ) : (
        <span>Unavailable</span>
      );
    },
  },
  { key: "system", header: "System", render: (row) => sourceText(row.system) },
  {
    key: "permission",
    header: "Permission",
    render: (row) => sourceText(row.permission),
  },
  {
    key: "department",
    header: "Department",
    render: (row) => sourceText(row.department),
  },
  { key: "country", header: "Country", render: (row) => sourceText(row.country) },
  {
    key: "vsts-status",
    header: "SharePoint-side VSTS Status",
    render: (row) => (
      <StatusBadge tone="neutral">{sourceText(row.vstsStatus)}</StatusBadge>
    ),
  },
  {
    key: "created",
    header: "Created",
    render: (row) => (
      <span>
        {sourceText(row.createdDateText)}
        {row.createdDateText ? <small className="legacy-list__date-note">Timezone unknown</small> : null}
      </span>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    render: (row) => (
      <span>
        {sourceText(row.updatedDateText)}
        {row.updatedDateText ? <small className="legacy-list__date-note">Timezone unknown</small> : null}
      </span>
    ),
  },
];

export function canViewLegacyRequestList(roles: readonly PortalRole[]): boolean {
  return roles.includes("Admin");
}

export function normalizeLegacyRequestListLimit(
  limit: number,
): LegacyRequestListLimit {
  return limit === MAX_LEGACY_REQUEST_LIST_LIMIT
    ? MAX_LEGACY_REQUEST_LIST_LIMIT
    : DEFAULT_LEGACY_REQUEST_LIST_LIMIT;
}

export async function loadLegacyRequestListForRoles(
  api: LegacyRequestListApi,
  roles: readonly PortalRole[],
  requestedLimit: number,
): Promise<LegacyUserRequestListResponse | null> {
  if (!canViewLegacyRequestList(roles)) return null;
  return api.getLegacyUserRequests(
    normalizeLegacyRequestListLimit(requestedLimit),
  );
}

export function legacyRequestListErrorState(
  error: unknown,
): LegacyRequestListViewState {
  if (error instanceof AuthApiError) {
    if (error.status === 401) return { kind: "unauthorized" };
    if (error.status === 403) return { kind: "forbidden" };
    if (error.status === 503) return { kind: "unavailable" };
  }
  return { kind: "error" };
}

function StateMessage({
  title,
  description,
  danger = false,
}: {
  readonly title: string;
  readonly description: string;
  readonly danger?: boolean;
}) {
  return (
    <div
      className={
        "safety-banner legacy-list__state safety-banner--" +
        (danger ? "danger" : "info")
      }
      role={danger ? "alert" : "status"}
    >
      <span aria-hidden="true">{danger ? "!" : "i"}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

export interface LegacyRequestListViewProps {
  readonly state: LegacyRequestListViewState;
  readonly limit: LegacyRequestListLimit;
  readonly onLimitChange: (limit: LegacyRequestListLimit) => void;
  readonly onRefresh: () => void;
}

export function LegacyRequestListView({
  state,
  limit,
  onLimitChange,
  onRefresh,
}: LegacyRequestListViewProps) {
  const response = state.kind === "success" ? state.response : null;
  const tableRows: readonly LegacyRequestTableRow[] =
    response?.requests.map((request, index) => ({
      ...request,
      rowKey: (request.externalRequestId ?? "unavailable") + "-" + index,
    })) ?? [];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Legacy source observation"
        title="Legacy Requests"
        description="Inspect bounded request summaries from the existing legacy User Request data source."
        actions={
          <div className="legacy-list__header-actions">
            <StatusBadge tone="warning">READ ONLY</StatusBadge>
            <StatusBadge tone="neutral">LEGACY DATA</StatusBadge>
            <button
              className="button button--secondary button--compact"
              type="button"
              disabled={state.kind === "loading"}
              onClick={onRefresh}
            >
              Refresh
            </button>
          </div>
        }
      />

      <aside className="safety-banner safety-banner--info">
        <span aria-hidden="true">i</span>
        <div>
          <strong>Legacy SQL source · Read only</strong>
          <p>
            Requests are read from the existing legacy User Request data source.
            This Portal does not modify the source system.
          </p>
        </div>
      </aside>

      <section className="panel" aria-labelledby="legacy-list-title">
        <div className="panel-heading legacy-list__heading">
          <div>
            <p className="panel-kicker">Legacy SQL integration</p>
            <h2 id="legacy-list-title">Request observations</h2>
          </div>
          <span className="panel-meta">
            {response ? "Connected (Read only)" : "Bounded read: 20 / 50"}
          </span>
        </div>

        <div className="legacy-list__controls">
          <label className="field">
            <span>Rows</span>
            <select
              aria-label="Legacy request row limit"
              value={limit}
              onChange={(event) =>
                onLimitChange(
                  normalizeLegacyRequestListLimit(Number(event.target.value)),
                )
              }
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <p>
            The request is bounded by the selected limit. Search and pagination
            are not available for this source.
          </p>
        </div>

        <div aria-live="polite">
          {state.kind === "loading" ? (
            <StateMessage
              title="Loading legacy requests"
              description="Reading a bounded list through the authenticated read-only API."
            />
          ) : null}
          {state.kind === "unauthorized" ? (
            <StateMessage
              danger
              title="Authentication required"
              description="The session could not be authenticated. Sign in again before retrying."
            />
          ) : null}
          {state.kind === "forbidden" ? (
            <StateMessage
              danger
              title="Administrator access required"
              description="Administrator access is required to view legacy requests."
            />
          ) : null}
          {state.kind === "unavailable" ? (
            <StateMessage
              danger
              title="Legacy requests unavailable"
              description="Legacy request data is temporarily unavailable. No source data was changed."
            />
          ) : null}
          {state.kind === "error" ? (
            <StateMessage
              danger
              title="Unable to load legacy requests"
              description="The read-only request could not be completed. Try again later."
            />
          ) : null}

          {response ? (
            <>
              <p className="legacy-list__result-note">
                Showing {response.rowsRead} of up to {response.limit} requested
                rows. Date text is displayed as observed; timezone is unknown.
              </p>
              <DataTable
                caption="Read-only legacy User Request summaries"
                columns={columns}
                rows={tableRows}
                rowKey={(row) => row.rowKey}
                emptyMessage="No legacy requests were returned for this bounded read."
              />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function LegacyRequestsPage({
  roles,
  api,
}: {
  readonly roles: readonly PortalRole[];
  readonly api: LegacyRequestListApi;
}) {
  const authorized = canViewLegacyRequestList(roles);
  const [limit, setLimit] = useState<LegacyRequestListLimit>(
    DEFAULT_LEGACY_REQUEST_LIST_LIMIT,
  );
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [state, setState] = useState<LegacyRequestListViewState>({
    kind: "loading",
  });

  const refresh = useCallback(() => {
    setRefreshAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!authorized) return;

    let active = true;
    setState({ kind: "loading" });
    void loadLegacyRequestListForRoles(api, roles, limit)
      .then((response) => {
        if (active && response) setState({ kind: "success", response });
      })
      .catch((error: unknown) => {
        if (active) setState(legacyRequestListErrorState(error));
      });

    return () => {
      active = false;
    };
  }, [api, authorized, limit, refreshAttempt, roles]);

  return (
    <LegacyRequestListView
      state={state}
      limit={limit}
      onLimitChange={setLimit}
      onRefresh={refresh}
    />
  );
}
