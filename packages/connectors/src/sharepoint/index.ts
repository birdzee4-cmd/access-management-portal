import type { ReadOnlyLegacyConnector } from "../read-only.js";

/**
 * Port reserved for query-only SharePoint access.
 * No implementation, credential handling, or write operation exists.
 */
export interface ReadOnlySharePointConnector extends ReadOnlyLegacyConnector {
  readonly source: "SHAREPOINT";
}
