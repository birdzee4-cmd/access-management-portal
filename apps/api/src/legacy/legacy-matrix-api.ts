import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
  LegacySqlRowLimitError,
  LegacySqlTableNotAllowedError,
  MAX_LEGACY_MATRIX_ROWS,
  matrixSources,
  type MatrixSource,
} from "@access-portal/connectors";
import type {
  LegacyMatrixRow,
  LegacyMatrixRowsResponse,
  LegacyMatrixSummaryResponse,
} from "@access-portal/contracts";
import type { HttpResponseInit } from "@azure/functions";

import {
  AuthenticationConfigurationError,
  AuthenticationError,
  AuthorizationError,
  requireAuthenticatedUser,
  requireRole,
  type AuthenticationRequest,
  type AuthenticationService,
} from "../auth/index.js";
import {
  maskLegacyManager,
  normalizeLegacyMatrixValue,
  type LegacyCatalogService,
  type LegacyMatrixSummary,
} from "../services/index.js";

export const DEFAULT_LEGACY_MATRIX_ROWS = 20;

type MatrixCatalogService = Pick<
  LegacyCatalogService,
  "getMatrixRows" | "getMatrixSummary"
>;

export interface LegacyMatrixQuery {
  get(name: string): string | null;
  getAll(name: string): string[];
  keys(): IterableIterator<string>;
}

export interface LegacyMatrixRequest extends AuthenticationRequest {
  readonly query: LegacyMatrixQuery;
}

export interface LegacyMatrixLogger {
  info(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
  warn(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
}

export interface LegacyMatrixApiDependencies {
  readonly getAuthenticationService: () => AuthenticationService;
  readonly getLegacyCatalogService: () => MatrixCatalogService;
}

type LegacyMatrixInputErrorCode =
  | "missing_source"
  | "invalid_source"
  | "invalid_limit"
  | "unsupported_query_parameter";

export class LegacyMatrixInputError extends Error {
  readonly statusCode = 400;

  constructor(readonly code: LegacyMatrixInputErrorCode) {
    super("The legacy matrix request is invalid.");
    this.name = "LegacyMatrixInputError";
  }
}

function validateQueryKeys(
  query: LegacyMatrixQuery,
  allowedKeys: ReadonlySet<string>,
): void {
  for (const key of query.keys()) {
    if (!allowedKeys.has(key)) {
      throw new LegacyMatrixInputError("unsupported_query_parameter");
    }
  }
}

function parseSource(query: LegacyMatrixQuery): MatrixSource {
  const sourceValues = query.getAll("source");
  if (sourceValues.length === 0 || sourceValues[0] === "") {
    throw new LegacyMatrixInputError("missing_source");
  }

  if (
    sourceValues.length !== 1 ||
    !matrixSources.some((source) => source === sourceValues[0])
  ) {
    throw new LegacyMatrixInputError("invalid_source");
  }

  return sourceValues[0] as MatrixSource;
}

function parseLimit(query: LegacyMatrixQuery): number {
  const limitValues = query.getAll("limit");
  if (limitValues.length === 0) {
    return DEFAULT_LEGACY_MATRIX_ROWS;
  }

  const value = limitValues[0];
  if (
    limitValues.length !== 1 ||
    !value ||
    !/^[1-9][0-9]*$/.test(value)
  ) {
    throw new LegacyMatrixInputError("invalid_limit");
  }

  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1 ||
    parsed > MAX_LEGACY_MATRIX_ROWS
  ) {
    throw new LegacyMatrixInputError("invalid_limit");
  }

  return parsed;
}

export function parseLegacyMatrixRowsQuery(query: LegacyMatrixQuery): {
  readonly source: MatrixSource;
  readonly limit: number;
} {
  validateQueryKeys(query, new Set(["source", "limit"]));
  return {
    source: parseSource(query),
    limit: parseLimit(query),
  };
}

export function parseLegacyMatrixSummaryQuery(
  query: LegacyMatrixQuery,
): MatrixSource {
  validateQueryKeys(query, new Set(["source"]));
  return parseSource(query);
}

function sanitizeRow(row: {
  readonly roleName: string | null;
  readonly manager: string | null;
  readonly department: string | null;
  readonly active: string | null;
}): LegacyMatrixRow {
  return {
    roleName: normalizeLegacyMatrixValue(row.roleName),
    department: normalizeLegacyMatrixValue(row.department),
    managerMasked: maskLegacyManager(row.manager),
    active: normalizeLegacyMatrixValue(row.active),
  };
}

function sanitizeSummary(
  summary: LegacyMatrixSummary,
): LegacyMatrixSummaryResponse {
  return {
    source: summary.source,
    sampleSize: summary.sampleCount,
    sampleLimit: MAX_LEGACY_MATRIX_ROWS,
    sampleDistinctRoleCount: summary.distinctRoleNameCount,
    sampleDistinctDepartmentCount: summary.distinctDepartmentCount,
    sampleDistinctManagerCount: summary.distinctManagerCount,
    activePatterns: summary.activeValuePatterns,
    quality: summary.fieldQuality,
    normalizedDuplicateRows: summary.normalizedDuplicateRows,
    normalizedDuplicateGroups: summary.normalizedDuplicateGroups,
    roleNamesWithMultipleManagers: summary.roleNamesWithMultipleManagers,
    roleNamesWithMultipleDepartments: summary.roleNamesWithMultipleDepartments,
    departmentRolePairsWithMultipleManagers:
      summary.departmentRolePairsWithMultipleManagers,
  };
}

function noStoreHeaders(includeChallenge = false): Record<string, string> {
  return includeChallenge
    ? { "cache-control": "no-store", "www-authenticate": "Bearer" }
    : { "cache-control": "no-store" };
}

function errorResponse(error: unknown): HttpResponseInit {
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      headers: noStoreHeaders(true),
      jsonBody: { error: error.code },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      headers: noStoreHeaders(),
      jsonBody: { error: error.code },
    };
  }

  if (error instanceof LegacyMatrixInputError) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      jsonBody: { error: error.code },
    };
  }

  if (error instanceof AuthenticationConfigurationError) {
    return {
      status: 503,
      headers: noStoreHeaders(),
      jsonBody: { error: "authentication_not_configured" },
    };
  }

  if (error instanceof LegacySqlConfigurationError) {
    return {
      status: 503,
      headers: noStoreHeaders(),
      jsonBody: { error: "legacy_sql_not_configured" },
    };
  }

  if (error instanceof LegacySqlConnectorError) {
    return {
      status: 503,
      headers: noStoreHeaders(),
      jsonBody: { error: "legacy_sql_unavailable" },
    };
  }

  if (
    error instanceof LegacySqlReadGuardError ||
    error instanceof LegacySqlRowLimitError ||
    error instanceof LegacySqlTableNotAllowedError
  ) {
    return {
      status: 500,
      headers: noStoreHeaders(),
      jsonBody: { error: "legacy_matrix_safety_check_failed" },
    };
  }

  return {
    status: 500,
    headers: noStoreHeaders(),
    jsonBody: { error: "legacy_matrix_failed" },
  };
}

function safeErrorCode(error: unknown): string {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof LegacyMatrixInputError ||
    error instanceof LegacySqlConfigurationError ||
    error instanceof LegacySqlConnectorError ||
    error instanceof LegacySqlReadGuardError ||
    error instanceof LegacySqlRowLimitError ||
    error instanceof LegacySqlTableNotAllowedError
  ) {
    return error.code;
  }

  if (error instanceof AuthenticationConfigurationError) {
    return "AUTHENTICATION_CONFIGURATION_ERROR";
  }

  return "UNEXPECTED_ERROR";
}

async function requireAdmin(
  request: LegacyMatrixRequest,
  dependencies: LegacyMatrixApiDependencies,
): Promise<void> {
  const user = await requireAuthenticatedUser(
    request,
    dependencies.getAuthenticationService(),
  );
  requireRole(user, "Admin");
}

export async function handleLegacyMatrixRows(
  request: LegacyMatrixRequest,
  logger: LegacyMatrixLogger,
  dependencies: LegacyMatrixApiDependencies,
): Promise<HttpResponseInit> {
  let source: MatrixSource | undefined;
  let limit: number | undefined;

  try {
    await requireAdmin(request, dependencies);
    ({ source, limit } = parseLegacyMatrixRowsQuery(request.query));

    logger.info("Legacy matrix request authorized.", {
      endpoint: "legacy_matrix_rows",
      source,
      requestedLimit: limit,
    });

    const rows = await dependencies
      .getLegacyCatalogService()
      .getMatrixRows(source, limit);
    const body: LegacyMatrixRowsResponse = {
      source,
      rowsRead: rows.length,
      limit,
      rows: rows.map(sanitizeRow),
    };

    logger.info("Legacy matrix read completed.", {
      endpoint: "legacy_matrix_rows",
      source,
      requestedLimit: limit,
      rowsRead: rows.length,
    });

    return {
      status: 200,
      headers: noStoreHeaders(),
      jsonBody: body,
    };
  } catch (error) {
    logger.warn("Legacy matrix request failed.", {
      endpoint: "legacy_matrix_rows",
      ...(source ? { source } : {}),
      ...(limit ? { requestedLimit: limit } : {}),
      errorCode: safeErrorCode(error),
    });
    return errorResponse(error);
  }
}

export async function handleLegacyMatrixSummary(
  request: LegacyMatrixRequest,
  logger: LegacyMatrixLogger,
  dependencies: LegacyMatrixApiDependencies,
): Promise<HttpResponseInit> {
  let source: MatrixSource | undefined;

  try {
    await requireAdmin(request, dependencies);
    source = parseLegacyMatrixSummaryQuery(request.query);

    logger.info("Legacy matrix summary request authorized.", {
      endpoint: "legacy_matrix_summary",
      source,
      sampleLimit: MAX_LEGACY_MATRIX_ROWS,
    });

    const summary = await dependencies
      .getLegacyCatalogService()
      .getMatrixSummary(source, MAX_LEGACY_MATRIX_ROWS);
    const body = sanitizeSummary(summary);

    logger.info("Legacy matrix summary completed.", {
      endpoint: "legacy_matrix_summary",
      source,
      sampleLimit: MAX_LEGACY_MATRIX_ROWS,
      sampleSize: body.sampleSize,
    });

    return {
      status: 200,
      headers: noStoreHeaders(),
      jsonBody: body,
    };
  } catch (error) {
    logger.warn("Legacy matrix summary request failed.", {
      endpoint: "legacy_matrix_summary",
      ...(source ? { source } : {}),
      errorCode: safeErrorCode(error),
    });
    return errorResponse(error);
  }
}
