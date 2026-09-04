import {
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
  LegacyUserRequestRowLimitError,
} from "@access-portal/connectors";
import type { LegacyUserRequestListResponse } from "@access-portal/contracts";
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
  for (const key of query.keys()) {
    if (key !== "limit") {
      throw new LegacyUserRequestInputError("unsupported_query_parameter");
    }
  }

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

  try {
    const user = await requireAuthenticatedUser(
      request,
      dependencies.getAuthenticationService(),
    );
    requireRole(user, "Admin");
    limit = parseLegacyUserRequestLimit(request.query);

    logger.info("Legacy User Request list authorized.", {
      endpoint: "legacy_user_request_list",
      requestedLimit: limit,
    });

    const requests = await dependencies
      .getLegacyUserRequestService()
      .listRequests(limit);
    const body: LegacyUserRequestListResponse = {
      rowsRead: requests.length,
      limit,
      requests,
    };

    logger.info("Legacy User Request list completed.", {
      endpoint: "legacy_user_request_list",
      requestedLimit: limit,
      rowsRead: requests.length,
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
      errorCode: safeErrorCode(error),
    });
    return errorResponse(error);
  }
}
