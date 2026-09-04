import { readLegacySafetyPolicy } from "@access-portal/shared";

export type LegacySqlEnvironment = Readonly<
  Record<string, string | undefined>
>;

export interface LegacySqlConfig {
  readonly server: string;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly encrypt: boolean;
  readonly trustServerCertificate: boolean;
  readonly connectionTimeoutMs: number;
  readonly requestTimeoutMs: number;
}

export class LegacySqlConfigurationError extends Error {
  readonly code = "LEGACY_SQL_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "LegacySqlConfigurationError";
  }
}

function requireValue(
  environment: LegacySqlEnvironment,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value || value === "replace_me") {
    throw new LegacySqlConfigurationError(name + " is required.");
  }

  return value;
}

function readBoolean(
  environment: LegacySqlEnvironment,
  name: string,
  fallback: boolean,
): boolean {
  const value = environment[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new LegacySqlConfigurationError(name + " must be true or false.");
}

function readPositiveInteger(
  environment: LegacySqlEnvironment,
  name: string,
  fallback: number,
): number {
  const value = environment[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new LegacySqlConfigurationError(
      name + " must be a positive integer.",
    );
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new LegacySqlConfigurationError(
      name + " must be a safe positive integer.",
    );
  }

  return parsed;
}

/**
 * Reads a dedicated legacy SQL configuration without using DATABASE_URL.
 * This validates the repository-wide fail-closed legacy safety policy first.
 */
export function readLegacySqlConfig(
  environment: LegacySqlEnvironment,
): LegacySqlConfig {
  try {
    readLegacySafetyPolicy(environment);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Legacy safety policy is invalid.";
    throw new LegacySqlConfigurationError(message);
  }

  return {
    server: requireValue(environment, "LEGACY_SQL_SERVER"),
    database: requireValue(environment, "LEGACY_SQL_DATABASE"),
    user: requireValue(environment, "LEGACY_SQL_USER"),
    password: requireValue(environment, "LEGACY_SQL_PASSWORD"),
    encrypt: readBoolean(environment, "LEGACY_SQL_ENCRYPT", true),
    trustServerCertificate: readBoolean(
      environment,
      "LEGACY_SQL_TRUST_SERVER_CERTIFICATE",
      false,
    ),
    connectionTimeoutMs: readPositiveInteger(
      environment,
      "LEGACY_SQL_CONNECTION_TIMEOUT_MS",
      15_000,
    ),
    requestTimeoutMs: readPositiveInteger(
      environment,
      "LEGACY_SQL_REQUEST_TIMEOUT_MS",
      30_000,
    ),
  };
}
