import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
  LegacyUserRequestRowLimitError,
  normalizeLegacyUserRequestFilters,
} from "@access-portal/connectors";
import type {
  LegacyUserRequestFilters,
  LegacyUserRequestListResponse,
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
import type { LegacyUserRequestService } from "../services/index.js";

export const DEFAULT_LEGACY_USER_REQUEST_ROWS = 20;
export const MAX_LEGACY_USER_REQUEST_API_ROWS = 50;

type UserRequestService = Pick<LegacyUserRequestService, "listRequests">;

export interface LegacyUserRequestQuery {
  getAll(name: string): string[];
  keys(): IterableIterator<string>;
}

export interface LegacyUserRequestRequest extends AuthenticationRequest {
  readonly query: LegacyUserRequestQuery;
}

export interface LegacyUserRequestLogger {
  info(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
  warn(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
}

export interface LegacyUserRequestApiDependencies {
  readonly getAuthenticationService: () => AuthenticationService;
  readonly getLegacyUserRequestService: () => UserRequestService;
}

type LegacyUserRequestInputErrorCode =
  | "invalid_limit"
  | "invalid_filter"
  | "unsupported_query_parameter";

export class LegacyUserRequestInputError extends Error {
  readonly statusCode = 400;

  constructor(readonly code: LegacyUserRequestInputErrorCode) {
    super("The legacy User Request query is invalid.");
    this.name = "LegacyUserRequestInputError";
  }
}

export function parseLegacyUserRequestLimit(
  query: LegacyUserRequestQuery,
): number {
  const values = query.getAll("limit");
  if (values.length === 0) {
    return DEFAULT_LEGACY_USER_REQUEST_ROWS;
  }

  const value = values[0];
  if (
    values.length !== 1 ||
    !value ||
    !/^[1-9][0-9]*$/.test(value)
  ) {
    throw new LegacyUserRequestInputError("invalid_limit");
  }

  const limit = Number(value);
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_LEGACY_USER_REQUEST_API_ROWS
  ) {
    throw new LegacyUserRequestInputError("invalid_limit");
  }

  return limit;
}

const filterQueryKeys = [
  "system",
  "country",
  "vstsStatus",
  "department",
] as const;

export interface LegacyUserRequestListInput {
  readonly limit: number;
  readonly filters: LegacyUserRequestFilters;
}

export function parseLegacyUserRequestListQuery(
  query: LegacyUserRequestQuery,
): LegacyUserRequestListInput {
  const allowedKeys = new Set<string>(["limit", ...filterQueryKeys]);
  for (const key of query.keys()) {
    if (!allowedKeys.has(key)) {
      throw new LegacyUserRequestInputError("unsupported_query_parameter");
    }
  }

  const candidate: {
    system?: string;
    country?: string;
    vstsStatus?: string;
    department?: string;
  } = {};
  for (const key of filterQueryKeys) {
    const values = query.getAll(key);
    if (values.length > 1) {
      throw new LegacyUserRequestInputError("invalid_filter");
    }
    if (values.length === 1) candidate[key] = values[0] ?? "";
  }

  try {
    return {
      limit: parseLegacyUserRequestLimit(query),
      filters: normalizeLegacyUserRequestFilters(candidate),
    };
  } catch (error) {
    if (error instanceof LegacyUserRequestInputError) throw error;
    throw new LegacyUserRequestInputError("invalid_filter");
  }
}

function headers(includeChallenge = false): Record<string, string> {
  return includeChallenge
    ? { "cache-control": "no-store", "www-authenticate": "Bearer" }
    : { "cache-control": "no-store" };
}

function errorResponse(error: unknown): HttpResponseInit {
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      headers: headers(true),
      jsonBody: { error: error.code },
    };
  }
  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      headers: headers(),
      jsonBody: { error: error.code },
    };
  }
  if (error instanceof LegacyUserRequestInputError) {
    return {
      status: 400,
      headers: headers(),
      jsonBody: { error: error.code },
    };
  }
  if (error instanceof AuthenticationConfigurationError) {
    return {
      status: 503,
      headers: headers(),
      jsonBody: { error: "authentication_not_configured" },
    };
  }
  if (error instanceof LegacySqlConfigurationError) {
    return {
      status: 503,
      headers: headers(),
      jsonBody: { error: "legacy_sql_not_configured" },
    };
  }
  if (error instanceof LegacySqlConnectorError) {
    return {
      status: 503,
      headers: headers(),
      jsonBody: { error: "legacy_sql_unavailable" },
    };
  }
  if (
    error instanceof LegacySqlReadGuardError ||
    error instanceof LegacyUserRequestRowLimitError
  ) {
    return {
      status: 500,
      headers: headers(),
      jsonBody: { error: "legacy_user_request_safety_check_failed" },
    };
  }
  return {
    status: 500,
    headers: headers(),
    jsonBody: { error: "legacy_user_request_failed" },
  };
}

function safeErrorCode(error: unknown): string {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof LegacyUserRequestInputError ||
    error instanceof LegacySqlConfigurationError ||
    error instanceof LegacySqlConnectorError ||
    error instanceof LegacySqlReadGuardError ||
    error instanceof LegacyUserRequestRowLimitError
  ) {
    return error.code;
  }
  if (error instanceof AuthenticationConfigurationError) {
    return "AUTHENTICATION_CONFIGURATION_ERROR";
  }
  return "UNEXPECTED_ERROR";
}

export async function handleLegacyUserRequestList(
  request: LegacyUserRequestRequest,
  logger: LegacyUserRequestLogger,
  dependencies: LegacyUserRequestApiDependencies,
): Promise<HttpResponseInit> {
  let limit: number | undefined;
  let filterCount = 0;

  try {
    const user = await requireAuthenticatedUser(
      request,
      dependencies.getAuthenticationService(),
    );
    requireRole(user, "Admin");
    const input = parseLegacyUserRequestListQuery(request.query);
    limit = input.limit;
    filterCount = Object.keys(input.filters).length;

    logger.info("Legacy User Request list authorized.", {
      endpoint: "legacy_user_request_list",
      requestedLimit: limit,
      filterCount,
    });

    const requests = await dependencies
      .getLegacyUserRequestService()
      .listRequests(limit, input.filters);
    const body: LegacyUserRequestListResponse = {
      rowsRead: requests.length,
      limit,
      requests,
    };

    logger.info("Legacy User Request list completed.", {
      endpoint: "legacy_user_request_list",
      requestedLimit: limit,
      rowsRead: requests.length,
      filterCount,
    });

    return {
      status: 200,
      headers: headers(),
      jsonBody: body,
    };
  } catch (error) {
    logger.warn("Legacy User Request list failed.", {
      endpoint: "legacy_user_request_list",
      ...(limit ? { requestedLimit: limit } : {}),
      filterCount,
      errorCode: safeErrorCode(error),
    });
    return errorResponse(error);
  }
}
