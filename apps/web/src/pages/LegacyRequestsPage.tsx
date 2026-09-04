import type {
  LegacyUserRequestFilters,
  LegacyUserRequestListResponse,
  LegacyUserRequestSummary,
} from "@access-portal/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AuthApiError } from "../auth/authApi.js";
import type { PortalRole } from "../auth/types.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { normalizeLegacyRequestRouteId } from "./LegacyUserRequestDetailPage.js";

export const DEFAULT_LEGACY_REQUEST_LIST_LIMIT = 20;
export const MAX_LEGACY_REQUEST_LIST_LIMIT = 50;
export type LegacyRequestListLimit = 20 | 50;
export type LegacyRequestFilterKey = keyof LegacyUserRequestFilters;

const filterKeys = [
  "system",
  "country",
  "vstsStatus",
  "department",
] as const satisfies readonly LegacyRequestFilterKey[];

const filterMaximumLengths: Readonly<Record<LegacyRequestFilterKey, number>> = {
  system: 200,
  country: 100,
  vstsStatus: 200,
  department: 200,
};

export interface LegacyRequestListApi {
  getLegacyUserRequests(
    limit: LegacyRequestListLimit,
    filters?: LegacyUserRequestFilters,
  ): Promise<LegacyUserRequestListResponse>;
}

export type LegacyRequestListViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "invalid-filter" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "error" }
  | {
      readonly kind: "success";
      readonly response: LegacyUserRequestListResponse;
    };

export type LegacyRequestListUrlState =
  | {
      readonly valid: true;
      readonly limit: LegacyRequestListLimit;
      readonly filters: LegacyUserRequestFilters;
    }
  | { readonly valid: false };

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
  return normalizedId
    ? "/legacy-requests/" + encodeURIComponent(normalizedId)
    : null;
}

function isValidFilterValue(
  key: LegacyRequestFilterKey,
  value: string,
): boolean {
  return (
    value.length > 0 &&
    value.length <= filterMaximumLengths[key] &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

export function parseLegacyRequestListUrlState(
  searchParams: URLSearchParams,
): LegacyRequestListUrlState {
  const allowedKeys = new Set<string>(["limit", ...filterKeys]);
  for (const key of searchParams.keys()) {
    if (!allowedKeys.has(key)) return { valid: false };
  }

  const limitValues = searchParams.getAll("limit");
  if (limitValues.length > 1) return { valid: false };
  const limitValue = limitValues[0];
  if (limitValue !== undefined && limitValue !== "20" && limitValue !== "50") {
    return { valid: false };
  }

  const filters: {
    system?: string;
    country?: string;
    vstsStatus?: string;
    department?: string;
  } = {};
  for (const key of filterKeys) {
    const values = searchParams.getAll(key);
    if (values.length > 1) return { valid: false };
    if (values.length === 1) {
      const value = values[0]?.trim() ?? "";
      if (!isValidFilterValue(key, value)) return { valid: false };
      filters[key] = value;
    }
  }

  return {
    valid: true,
    limit: limitValue === "50" ? 50 : 20,
    filters,
  };
}

export function serializeLegacyRequestListUrlState(
  limit: LegacyRequestListLimit,
  filters: LegacyUserRequestFilters,
): URLSearchParams {
  const searchParams = new URLSearchParams({ limit: String(limit) });
  for (const key of filterKeys) {
    const value = filters[key];
    if (value) searchParams.set(key, value);
  }
  return searchParams;
}

function filterOptions(
  response: LegacyUserRequestListResponse | null,
  key: LegacyRequestFilterKey,
  selected: string | undefined,
): readonly string[] {
  const values = new Set<string>();
  if (selected) values.add(selected);
  for (const request of response?.requests ?? []) {
    const value = request[key];
    if (typeof value === "string" && value) values.add(value);
  }
  return [...values].sort((left, right) => left.localeCompare(right));
}

const columns = (
  listSearch: string,
): readonly DataTableColumn<LegacyRequestTableRow>[] => [
  {
    key: "id",
    header: "Legacy Request ID",
    render: (row) => {
      const route = detailRoute(row.externalRequestId);
      return route ? (
        <Link className="legacy-list__detail-link" to={route + listSearch}>
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
        {row.createdDateText ? (
          <small className="legacy-list__date-note">Timezone unknown</small>
        ) : null}
      </span>
    ),
  },
  {
    key: "updated",
    header: "Updated",
    render: (row) => (
      <span>
        {sourceText(row.updatedDateText)}
        {row.updatedDateText ? (
          <small className="legacy-list__date-note">Timezone unknown</small>
        ) : null}
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
  filters: LegacyUserRequestFilters = {},
): Promise<LegacyUserRequestListResponse | null> {
  if (!canViewLegacyRequestList(roles)) return null;
  return api.getLegacyUserRequests(
    normalizeLegacyRequestListLimit(requestedLimit),
    filters,
  );
}

export function legacyRequestListErrorState(
  error: unknown,
): LegacyRequestListViewState {
  if (error instanceof AuthApiError) {
    if (error.status === 400) return { kind: "invalid-filter" };
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

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={"Legacy request " + label.toLowerCase() + " filter"}
        value={value}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">All observed values</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface LegacyRequestListViewProps {
  readonly state: LegacyRequestListViewState;
  readonly limit: LegacyRequestListLimit;
  readonly filters: LegacyUserRequestFilters;
  readonly listSearch: string;
  readonly onLimitChange: (limit: LegacyRequestListLimit) => void;
  readonly onFilterChange: (
    key: LegacyRequestFilterKey,
    value: string | undefined,
  ) => void;
  readonly onClearFilters: () => void;
  readonly onRefresh: () => void;
}

export function LegacyRequestListView({
  state,
  limit,
  filters,
  listSearch,
  onLimitChange,
  onFilterChange,
  onClearFilters,
  onRefresh,
}: LegacyRequestListViewProps) {
  const response = state.kind === "success" ? state.response : null;
  const tableRows: readonly LegacyRequestTableRow[] =
    response?.requests.map((request, index) => ({
      ...request,
      rowKey: (request.externalRequestId ?? "unavailable") + "-" + index,
    })) ?? [];
  const hasFilters = filterKeys.some((key) => filters[key]);

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

        <div className="legacy-list__controls" aria-label="Legacy request filters">
          <FilterSelect
            label="System"
            value={filters.system ?? ""}
            options={filterOptions(response, "system", filters.system)}
            onChange={(value) => onFilterChange("system", value)}
          />
          <FilterSelect
            label="Country"
            value={filters.country ?? ""}
            options={filterOptions(response, "country", filters.country)}
            onChange={(value) => onFilterChange("country", value)}
          />
          <FilterSelect
            label="VSTS Status"
            value={filters.vstsStatus ?? ""}
            options={filterOptions(response, "vstsStatus", filters.vstsStatus)}
            onChange={(value) => onFilterChange("vstsStatus", value)}
          />
          <FilterSelect
            label="Department"
            value={filters.department ?? ""}
            options={filterOptions(response, "department", filters.department)}
            onChange={(value) => onFilterChange("department", value)}
          />
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
          <button
            className="button button--secondary button--compact"
            type="button"
            disabled={!hasFilters}
            onClick={onClearFilters}
          >
            Clear filters
          </button>
          <p>
            Filters use exact source values observed in this bounded result.
            Options are not an authoritative or complete value list.
          </p>
        </div>

        <div aria-live="polite">
          {state.kind === "loading" ? (
            <StateMessage
              title="Loading legacy requests"
              description="Reading a bounded list through the authenticated read-only API."
            />
          ) : null}
          {state.kind === "invalid-filter" ? (
            <StateMessage
              danger
              title="Invalid legacy request filter"
              description="The filter URL is invalid or unsupported. Clear the filters before retrying."
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
                {response.rowsRead} rows returned from a bounded legacy result.
                Showing up to {response.limit} matching legacy requests.
                {response.rowsRead === response.limit
                  ? " Additional matching records may exist."
                  : ""}{" "}
                Date text is displayed as observed; timezone is unknown.
              </p>
              <DataTable
                caption="Read-only legacy User Request summaries"
                columns={columns(listSearch)}
                rows={tableRows}
                rowKey={(row) => row.rowKey}
                emptyMessage="No legacy requests matched the selected exact filters."
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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryText = searchParams.toString();
  const urlState = useMemo(
    () => parseLegacyRequestListUrlState(new URLSearchParams(queryText)),
    [queryText],
  );
  const limit = urlState.valid ? urlState.limit : 20;
  const filters = urlState.valid ? urlState.filters : {};
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const [state, setState] = useState<LegacyRequestListViewState>({
    kind: "loading",
  });

  const setUrlState = useCallback(
    (
      nextLimit: LegacyRequestListLimit,
      nextFilters: LegacyUserRequestFilters,
    ) => {
      setSearchParams(
        serializeLegacyRequestListUrlState(nextLimit, nextFilters),
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!authorized) return;
    if (!urlState.valid) {
      setState({ kind: "invalid-filter" });
      return;
    }

    let active = true;
    setState({ kind: "loading" });
    void loadLegacyRequestListForRoles(api, roles, limit, filters)
      .then((response) => {
        if (active && response) setState({ kind: "success", response });
      })
      .catch((error: unknown) => {
        if (active) setState(legacyRequestListErrorState(error));
      });

    return () => {
      active = false;
    };
  }, [api, authorized, limit, queryText, refreshAttempt, roles, urlState.valid]);

  const listSearch = urlState.valid
    ? "?" + serializeLegacyRequestListUrlState(limit, filters).toString()
    : "";

  return (
    <LegacyRequestListView
      state={state}
      limit={limit}
      filters={filters}
      listSearch={listSearch}
      onLimitChange={(nextLimit) => setUrlState(nextLimit, filters)}
      onFilterChange={(key, value) =>
        setUrlState(limit, { ...filters, [key]: value })
      }
      onClearFilters={() => setUrlState(limit, {})}
      onRefresh={() => setRefreshAttempt((attempt) => attempt + 1)}
    />
  );
}
