import { LegacySqlConnector } from "@access-portal/connectors";

import { LegacyCatalogService } from "../services/index.js";

let connector: LegacySqlConnector | undefined;
let service: LegacyCatalogService | undefined;

/**
 * Lazily validates local legacy SQL configuration and constructs the read-only
 * connector. No connection or query happens until a service method is called.
 */
export function getRuntimeLegacyCatalogService(): LegacyCatalogService {
  connector ??= LegacySqlConnector.fromEnvironment(process.env);
  service ??= new LegacyCatalogService(connector);
  return service;
}
