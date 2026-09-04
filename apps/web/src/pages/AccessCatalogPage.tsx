import {
  legacyMatrixSources,
  type LegacyMatrixRowsResponse,
  type LegacyMatrixSource,
  type LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";
import { useEffect, useState } from "react";

import { AuthApiError } from "../auth/authApi.js";
import type { PortalRole } from "../auth/types.js";
import { DataTable, type DataTableColumn } from "../components/DataTable.js";
import { PageHeader } from "../components/PageHeader.js";
import { StatusBadge, type StatusTone } from "../components/StatusBadge.js";
import { catalogEntries } from "../portal/mockData.js";

type CatalogRow = (typeof catalogEntries)[number];
export type LegacyMatrixLimit = 20 | 50;

export interface LegacyMatrixApi {
  getLegacyMatrixRows(
    source: LegacyMatrixSource,
    limit: LegacyMatrixLimit,
  ): Promise<LegacyMatrixRowsResponse>;
  getLegacyMatrixSummary(
    source: LegacyMatrixSource,
  ): Promise<LegacyMatrixSummaryResponse>;
}

export interface LegacyMatrixData {
  readonly rows: LegacyMatrixRowsResponse;
  readonly summary: LegacyMatrixSummaryResponse;
}

export type LegacyMatrixViewState =
  | { readonly kind: "loading" }
  | { readonly kind: "unauthorized" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "success"; readonly data: LegacyMatrixData };

function riskTone(risk: CatalogRow["risk"]): StatusTone {
  return risk === "High" ? "danger" : risk === "Medium" ? "warning" : "success";
}

function activeTone(active: string | null): StatusTone {
  return active?.trim().toUpperCase() === "ACTIVE" ? "success" : "neutral";
}

const catalogColumns: readonly DataTableColumn<CatalogRow>[] = [
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

type LegacyMatrixTableRow = LegacyMatrixRowsResponse["rows"][number] & {
  readonly rowKey: string;
};

const legacyColumns: readonly DataTableColumn<LegacyMatrixTableRow>[] = [
  {
    key: "role",
    header: "Role",
    render: (row) => (
      <strong className="table-primary">{row.roleName ?? "Not available"}</strong>
    ),
  },
  {
    key: "department",
    header: "Department",
    render: (row) => row.department ?? "Not available",
  },
  {
    key: "manager",
    header: "Manager",
    render: (row) => row.managerMasked ?? "Not available",
  },
  {
    key: "active",
    header: "Active",
    render: (row) => (
      <StatusBadge tone={activeTone(row.active)}>
        {row.active ?? "Not available"}
      </StatusBadge>
    ),
  },
];

export function canViewLegacyMatrix(roles: readonly PortalRole[]): boolean {
  return roles.includes("Admin");
}

export async function loadLegacyMatrixForRoles(
  api: LegacyMatrixApi,
  roles: readonly PortalRole[],
  source: LegacyMatrixSource,
  limit: LegacyMatrixLimit,
): Promise<LegacyMatrixData | null> {
  if (!canViewLegacyMatrix(roles)) {
    return null;
  }

  const [rows, summary] = await Promise.all([
    api.getLegacyMatrixRows(source, limit),
    api.getLegacyMatrixSummary(source),
  ]);
  return { rows, summary };
}

export function legacyMatrixErrorState(error: unknown): LegacyMatrixViewState {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      return { kind: "unauthorized" };
    }
    if (error.status === 403) {
      return { kind: "forbidden" };
    }
  }
  return { kind: "unavailable" };
}

function LegacyMatrixMessage({
  title,
  description,
  tone = "info",
}: {
  readonly title: string;
  readonly description: string;
  readonly tone?: "info" | "danger";
}) {
  return (
    <div
      className={"safety-banner safety-banner--" + tone + " legacy-matrix__message"}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span aria-hidden="true">{tone === "danger" ? "!" : "i"}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

export interface LegacyMatrixPanelViewProps {
  readonly authorized: boolean;
  readonly source: LegacyMatrixSource;
  readonly limit: LegacyMatrixLimit;
  readonly state: LegacyMatrixViewState;
  readonly onSourceChange: (source: LegacyMatrixSource) => void;
  readonly onLimitChange: (limit: LegacyMatrixLimit) => void;
}

export function LegacyMatrixPanelView({
  authorized,
  source,
  limit,
  state,
  onSourceChange,
  onLimitChange,
}: LegacyMatrixPanelViewProps) {
  if (!authorized) {
    return (
      <section className="panel legacy-matrix" aria-labelledby="legacy-matrix-title">
        <div className="panel-heading">
          <div>
            <p className="panel-kicker">Legacy source reference</p>
            <h2 id="legacy-matrix-title">Legacy Role Matrix</h2>
          </div>
          <StatusBadge tone="warning">READ ONLY</StatusBadge>
        </div>
        <div className="legacy-matrix__body">
          <LegacyMatrixMessage
            title="Administrator access required"
            description="Administrator access is required to view the legacy role matrix."
          />
        </div>
      </section>
    );
  }

  const data = state.kind === "success" ? state.data : null;
  const tableRows: readonly LegacyMatrixTableRow[] =
    data?.rows.rows.map((row, index) => ({
      ...row,
      rowKey: data.rows.source + "-" + index,
    })) ?? [];

  return (
    <section className="panel legacy-matrix" aria-labelledby="legacy-matrix-title">
      <div className="panel-heading legacy-matrix__heading">
        <div>
          <p className="panel-kicker">Legacy source reference</p>
          <h2 id="legacy-matrix-title">Legacy Role Matrix</h2>
        </div>
        <StatusBadge tone="warning">READ ONLY</StatusBadge>
      </div>

      <div className="legacy-matrix__controls" aria-label="Legacy matrix filters">
        <label className="field">
          <span>Source</span>
          <select
            aria-label="Legacy matrix source"
            value={source}
            onChange={(event) =>
              onSourceChange(event.target.value as LegacyMatrixSource)
            }
          >
            {legacyMatrixSources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Rows</span>
          <select
            aria-label="Legacy matrix row limit"
            value={limit}
            onChange={(event) =>
              onLimitChange(Number(event.target.value) as LegacyMatrixLimit)
            }
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
        <p>
          Data is retrieved through the protected Portal API. Manager values remain
          masked.
        </p>
      </div>

      <div className="legacy-matrix__body" aria-live="polite">
        {state.kind === "loading" ? (
          <LegacyMatrixMessage
            title="Loading legacy matrix"
            description="Reading the selected bounded sample through the read-only API."
          />
        ) : null}
        {state.kind === "unauthorized" ? (
          <LegacyMatrixMessage
            tone="danger"
            title="Authentication required"
            description="The session could not be authenticated. Sign in again before retrying."
          />
        ) : null}
        {state.kind === "forbidden" ? (
          <LegacyMatrixMessage
            tone="danger"
            title="Access denied"
            description="The API requires the Admin role for this legacy matrix."
          />
        ) : null}
        {state.kind === "unavailable" ? (
          <LegacyMatrixMessage
            tone="danger"
            title="Legacy matrix unavailable"
            description="The read-only API is currently unavailable. No legacy data was changed."
          />
        ) : null}

        {data ? (
          <>
            <div className="legacy-matrix__summary" aria-label="Matrix sample summary">
              <div>
                <span>Source</span>
                <strong>{data.summary.source}</strong>
              </div>
              <div>
                <span>Rows sampled</span>
                <strong>{data.summary.sampleSize}</strong>
              </div>
              <div>
                <span>Roles</span>
                <strong>{data.summary.sampleDistinctRoleCount}</strong>
              </div>
              <div>
                <span>Departments</span>
                <strong>{data.summary.sampleDistinctDepartmentCount}</strong>
              </div>
              <div>
                <span>Manager relationships</span>
                <strong>{data.summary.sampleDistinctManagerCount}</strong>
              </div>
            </div>
            <p className="legacy-matrix__sample-note">
              Showing {data.rows.rowsRead} of up to {data.rows.limit} requested rows.
              Summary metrics describe a bounded sample of up to{" "}
              {data.summary.sampleLimit} rows.
            </p>
            <DataTable
              caption={"Legacy role matrix sample for " + data.rows.source}
              columns={legacyColumns}
              rows={tableRows}
              rowKey={(row) => row.rowKey}
              emptyMessage="No legacy matrix rows were returned for this source."
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

export interface AccessCatalogPageProps {
  readonly roles: readonly PortalRole[];
  readonly api: LegacyMatrixApi;
}

export function AccessCatalogPage({ roles, api }: AccessCatalogPageProps) {
  const authorized = canViewLegacyMatrix(roles);
  const [source, setSource] = useState<LegacyMatrixSource>("NEW");
  const [limit, setLimit] = useState<LegacyMatrixLimit>(20);
  const [state, setState] = useState<LegacyMatrixViewState>({ kind: "loading" });

  useEffect(() => {
    if (!authorized) {
      return;
    }

    let active = true;
    setState({ kind: "loading" });
    void loadLegacyMatrixForRoles(api, roles, source, limit)
      .then((data) => {
        if (active && data) {
          setState({ kind: "success", data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState(legacyMatrixErrorState(error));
        }
      });

    return () => {
      active = false;
    };
  }, [api, authorized, limit, roles, source]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Role & access catalog"
        title="Access Catalog"
        description="Explore the normalized future catalog and an Admin-only, read-only view of approved legacy role-matrix sources."
        actions={<StatusBadge tone="neutral">View only</StatusBadge>}
      />
      <div className="catalog-stack">
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
            columns={catalogColumns}
            rows={catalogEntries}
            rowKey={(row) => row.system + row.application + row.role}
          />
        </section>
        <LegacyMatrixPanelView
          authorized={authorized}
          source={source}
          limit={limit}
          state={state}
          onSourceChange={setSource}
          onLimitChange={setLimit}
        />
      </div>
    </div>
  );
}
