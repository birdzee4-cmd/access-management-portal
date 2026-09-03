import type { ReadOnlyLegacyConnector } from "../read-only.js";

/**
 * Port reserved for query-only access to legacy SQL.
 * No implementation, connection configuration, or mutation operation exists.
 */
export interface ReadOnlyLegacySqlConnector extends ReadOnlyLegacyConnector {
  readonly source: "LEGACY_SQL";
}
