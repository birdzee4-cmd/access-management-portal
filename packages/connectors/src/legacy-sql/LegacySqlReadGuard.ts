const forbiddenKeywords = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "EXEC",
  "EXECUTE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "DENY",
  "BACKUP",
  "RESTORE",
  "DBCC",
  "INTO",
  "USE",
  "DECLARE",
  "SET",
  "WAITFOR",
  "OPENROWSET",
  "OPENQUERY",
  "BULK",
] as const;

const forbiddenKeywordPattern = new RegExp(
  "\\b(" + forbiddenKeywords.join("|") + ")\\b",
  "i",
);

export class LegacySqlReadGuardError extends Error {
  readonly code = "LEGACY_SQL_READ_GUARD_REJECTED";

  constructor(message: string) {
    super(message);
    this.name = "LegacySqlReadGuardError";
  }
}

/**
 * Allows one plain SELECT statement only. Comments are rejected because they
 * can hide chained statements or change how SQL tokens are interpreted.
 */
export function assertLegacySqlReadOnlyQuery(sqlText: string): string {
  let statement = sqlText.trim();

  if (statement.length === 0) {
    throw new LegacySqlReadGuardError("Legacy SQL query must not be empty.");
  }

  if (
    statement.includes("--") ||
    statement.includes("/*") ||
    statement.includes("*/")
  ) {
    throw new LegacySqlReadGuardError(
      "SQL comments are not permitted in legacy read queries.",
    );
  }

  if (statement.endsWith(";")) {
    statement = statement.slice(0, -1).trimEnd();
  }

  if (statement.includes(";")) {
    throw new LegacySqlReadGuardError(
      "Multiple SQL statements are not permitted.",
    );
  }

  if (!/^SELECT\b/i.test(statement)) {
    throw new LegacySqlReadGuardError(
      "Only SELECT statements are permitted for legacy SQL.",
    );
  }

  if (forbiddenKeywordPattern.test(statement)) {
    throw new LegacySqlReadGuardError(
      "A forbidden SQL operation was detected.",
    );
  }

  return statement;
}
