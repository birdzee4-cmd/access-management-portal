import { LegacySqlConnector } from "@access-portal/connectors";

import {
  LegacyCatalogService,
  LegacyUserRequestDetailService,
  LegacyUserRequestService,
} from "../services/index.js";

let connector: LegacySqlConnector | undefined;
let service: LegacyCatalogService | undefined;
let userRequestService: LegacyUserRequestService | undefined;
let userRequestDetailService: LegacyUserRequestDetailService | undefined;

function getRuntimeLegacySqlConnector(): LegacySqlConnector {
  connector ??= LegacySqlConnector.fromEnvironment(process.env);
  return connector;
}

/**
 * Lazily validates local legacy SQL configuration and constructs the read-only
 * connector. No connection or query happens until a service method is called.
 */
export function getRuntimeLegacyCatalogService(): LegacyCatalogService {
  service ??= new LegacyCatalogService(getRuntimeLegacySqlConnector());
  return service;
}

export function getRuntimeLegacyUserRequestService(): LegacyUserRequestService {
  userRequestService ??= new LegacyUserRequestService(
    getRuntimeLegacySqlConnector(),
  );
  return userRequestService;
}

export function getRuntimeLegacyUserRequestDetailService(): LegacyUserRequestDetailService {
  userRequestDetailService ??= new LegacyUserRequestDetailService(
    getRuntimeLegacySqlConnector(),
  );
  return userRequestDetailService;
}
