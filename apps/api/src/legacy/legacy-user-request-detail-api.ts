import {
  LegacyRelatedVstsLimitError,
  LegacySharepointIdError,
  LegacySqlConfigurationError,
  LegacySqlConnectorError,
  LegacySqlReadGuardError,
} from "@access-portal/connectors";
import type { LegacyUserRequestDetail } from "@access-portal/contracts";
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
  LegacyUserRequestDuplicateError,
  LegacyUserRequestNotFoundError,
  type LegacyUserRequestDetailService,
} from "../services/index.js";

const MAX_SQL_INT = 2_147_483_647;

type DetailService = Pick<LegacyUserRequestDetailService, "getDetail">;

export interface LegacyUserRequestDetailQuery {
  keys(): IterableIterator<string>;
}

export interface LegacyUserRequestDetailRequest extends AuthenticationRequest {
  readonly params: Readonly<Record<string, string | undefined>>;
  readonly query: LegacyUserRequestDetailQuery;
}

export interface LegacyUserRequestDetailLogger {
  info(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
  warn(
    message: string,
    properties: Readonly<Record<string, string | number>>,
  ): void;
}

export interface LegacyUserRequestDetailApiDependencies {
  readonly getAuthenticationService: () => AuthenticationService;
  readonly getLegacyUserRequestDetailService: () => DetailService;
}

type DetailInputErrorCode = "invalid_id" | "unsupported_query_parameter";

export class LegacyUserRequestDetailInputError extends Error {
  readonly statusCode = 400;

  constructor(readonly code: DetailInputErrorCode) {
    super("The legacy User Request detail identifier is invalid.");
    this.name = "LegacyUserRequestDetailInputError";
  }
}

export function parseLegacyUserRequestDetailId(
  request: Pick<LegacyUserRequestDetailRequest, "params" | "query">,
): number {
  for (const _key of request.query.keys()) {
    throw new LegacyUserRequestDetailInputError(
      "unsupported_query_parameter",
    );
  }

  const value = request.params.idSharepoint;
  if (!value || !/^[0-9]+$/.test(value)) {
    throw new LegacyUserRequestDetailInputError("invalid_id");
  }
  const idSharepoint = Number(value);
  if (
    !Number.isSafeInteger(idSharepoint) ||
    idSharepoint < 1 ||
    idSharepoint > MAX_SQL_INT
  ) {
    throw new LegacyUserRequestDetailInputError("invalid_id");
  }
  return idSharepoint;
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
  if (error instanceof LegacyUserRequestDetailInputError) {
    return {
      status: 400,
      headers: headers(),
      jsonBody: { error: error.code },
    };
  }
  if (error instanceof LegacyUserRequestNotFoundError) {
    return {
      status: 404,
      headers: headers(),
      jsonBody: { error: error.code },
    };
  }
  if (error instanceof LegacyUserRequestDuplicateError) {
    return {
      status: 409,
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
    error instanceof LegacySharepointIdError ||
    error instanceof LegacyRelatedVstsLimitError
  ) {
    return {
      status: 500,
      headers: headers(),
      jsonBody: { error: "legacy_user_request_detail_safety_check_failed" },
    };
  }
  return {
    status: 500,
    headers: headers(),
    jsonBody: { error: "legacy_user_request_detail_failed" },
  };
}

function safeErrorCode(error: unknown): string {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof LegacyUserRequestDetailInputError ||
    error instanceof LegacyUserRequestNotFoundError ||
    error instanceof LegacyUserRequestDuplicateError ||
    error instanceof LegacySqlConfigurationError ||
    error instanceof LegacySqlConnectorError ||
    error instanceof LegacySqlReadGuardError ||
    error instanceof LegacySharepointIdError ||
    error instanceof LegacyRelatedVstsLimitError
  ) {
    return error.code;
  }
  if (error instanceof AuthenticationConfigurationError) {
    return "AUTHENTICATION_CONFIGURATION_ERROR";
  }
  return "UNEXPECTED_ERROR";
}

export async function handleLegacyUserRequestDetail(
  request: LegacyUserRequestDetailRequest,
  logger: LegacyUserRequestDetailLogger,
  dependencies: LegacyUserRequestDetailApiDependencies,
): Promise<HttpResponseInit> {
  try {
    const user = await requireAuthenticatedUser(
      request,
      dependencies.getAuthenticationService(),
    );
    requireRole(user, "Admin");
    const idSharepoint = parseLegacyUserRequestDetailId(request);

    logger.info("Legacy User Request detail authorized.", {
      endpoint: "legacy_user_request_detail",
    });
    const detail: LegacyUserRequestDetail = await dependencies
      .getLegacyUserRequestDetailService()
      .getDetail(idSharepoint);
    logger.info("Legacy User Request detail completed.", {
      endpoint: "legacy_user_request_detail",
      returnedVstsRows: detail.relationship.returnedRowCount,
      relatedVstsRows: detail.relationship.sourceRowCount,
      statusComparison: detail.workflow.statusComparison,
    });

    return {
      status: 200,
      headers: headers(),
      jsonBody: detail,
    };
  } catch (error) {
    logger.warn("Legacy User Request detail failed.", {
      endpoint: "legacy_user_request_detail",
      errorCode: safeErrorCode(error),
    });
    return errorResponse(error);
  }
}
