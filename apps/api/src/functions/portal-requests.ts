import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { getRuntimeAuthenticationService } from "../auth/index.js";
import { createApiDataLayer } from "../data/container.js";
import { handlePortalCatalog, handlePortalRequestDetail, handlePortalRequestList, handlePortalRequestSubmit } from "../portal/index.js";

const dependencies = {
  getAuthenticationService: getRuntimeAuthenticationService,
  getPortalRequestService: () => createApiDataLayer().services.portalRequests,
};
app.http("portal-request-catalog", { methods: ["GET"], authLevel: "anonymous", route: "portal/catalog", handler: (request: HttpRequest, _context: InvocationContext) => handlePortalCatalog(request, dependencies) });
app.http("portal-request-list", { methods: ["GET"], authLevel: "anonymous", route: "portal/requests", handler: (request: HttpRequest, _context: InvocationContext) => handlePortalRequestList(request, dependencies) });
app.http("portal-request-submit", { methods: ["POST"], authLevel: "anonymous", route: "portal/requests", handler: (request: HttpRequest, _context: InvocationContext) => handlePortalRequestSubmit(request, dependencies) });
app.http("portal-request-detail", { methods: ["GET"], authLevel: "anonymous", route: "portal/requests/{id}", handler: (request: HttpRequest, _context: InvocationContext) => handlePortalRequestDetail(request, dependencies) });
