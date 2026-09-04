import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";

import { getRuntimeAuthenticationService } from "../auth/index.js";
import {
  getRuntimeLegacyUserRequestService,
  getRuntimeLegacyUserRequestDetailService,
  handleLegacyUserRequestDetail,
  handleLegacyUserRequestList,
  type LegacyUserRequestDetailLogger,
  type LegacyUserRequestLogger,
} from "../legacy/index.js";

const dependencies = {
  getAuthenticationService: getRuntimeAuthenticationService,
  getLegacyUserRequestService: getRuntimeLegacyUserRequestService,
};

const detailDependencies = {
  getAuthenticationService: getRuntimeAuthenticationService,
  getLegacyUserRequestDetailService: getRuntimeLegacyUserRequestDetailService,
};

function logger(context: InvocationContext): LegacyUserRequestLogger {
  return {
    info: (message, properties) => context.info(message, properties),
    warn: (message, properties) => context.warn(message, properties),
  };
}

function detailLogger(context: InvocationContext): LegacyUserRequestDetailLogger {
  return logger(context);
}

export function legacyUserRequestList(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleLegacyUserRequestList(request, logger(context), dependencies);
}

export function legacyUserRequestDetail(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleLegacyUserRequestDetail(
    request,
    detailLogger(context),
    detailDependencies,
  );
}

app.http("legacy-user-request-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "legacy/user-requests",
  handler: legacyUserRequestList,
});

app.http("legacy-user-request-detail", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "legacy/user-requests/{idSharepoint}",
  handler: legacyUserRequestDetail,
});
