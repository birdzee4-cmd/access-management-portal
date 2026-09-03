import type { ReadOnlyLegacyConnector } from "../read-only.js";

/**
 * Port reserved for query-only Azure DevOps / VSTS access.
 * No implementation, PAT handling, work-item update, or closure operation exists.
 */
export interface ReadOnlyAzureDevOpsConnector extends ReadOnlyLegacyConnector {
  readonly source: "AZURE_DEVOPS";
}
