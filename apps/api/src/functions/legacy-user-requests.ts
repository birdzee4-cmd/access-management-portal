import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";

import { getRuntimeAuthenticationService } from "../auth/index.js";
import {
  getRuntimeLegacyUserRequestService,
  handleLegacyUserRequestList,
  type LegacyUserRequestLogger,
} from "../legacy/index.js";

const dependencies = {
  getAuthenticationService: getRuntimeAuthenticationService,
  getLegacyUserRequestService: getRuntimeLegacyUserRequestService,
};

function logger(context: InvocationContext): LegacyUserRequestLogger {
  return {
    info: (message, properties) => context.info(message, properties),
    warn: (message, properties) => context.warn(message, properties),
  };
}

export function legacyUserRequestList(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleLegacyUserRequestList(request, logger(context), dependencies);
}

app.http("legacy-user-request-list", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "legacy/user-requests",
  handler: legacyUserRequestList,
});
