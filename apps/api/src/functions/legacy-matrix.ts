import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";

import { getRuntimeAuthenticationService } from "../auth/index.js";
import {
  getRuntimeLegacyCatalogService,
  handleLegacyMatrixRows,
  handleLegacyMatrixSummary,
  type LegacyMatrixLogger,
} from "../legacy/index.js";

const dependencies = {
  getAuthenticationService: getRuntimeAuthenticationService,
  getLegacyCatalogService: getRuntimeLegacyCatalogService,
};

function logger(context: InvocationContext): LegacyMatrixLogger {
  return {
    info: (message, properties) => context.info(message, properties),
    warn: (message, properties) => context.warn(message, properties),
  };
}

export function legacyMatrixRows(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleLegacyMatrixRows(request, logger(context), dependencies);
}

export function legacyMatrixSummary(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleLegacyMatrixSummary(request, logger(context), dependencies);
}

app.http("legacy-matrix-rows", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "legacy/matrix",
  handler: legacyMatrixRows,
});

app.http("legacy-matrix-summary", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "legacy/matrix/summary",
  handler: legacyMatrixSummary,
});
