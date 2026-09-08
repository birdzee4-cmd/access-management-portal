import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { getRuntimeAuthenticationService } from "../auth/index.js";
import { handleProductManagementForm, handleProductManagementList, handleProductManagementSubmit } from "../product-management/product-management-api.js";

const dependencies = { getAuthenticationService: getRuntimeAuthenticationService };
app.http("product-management-request-list", { methods: ["GET"], authLevel: "anonymous", route: "product-management/requests", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementList(request, dependencies) });
app.http("product-management-form", { methods: ["GET"], authLevel: "anonymous", route: "product-management/forms/{country}/{topic}", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementForm(request, dependencies) });
app.http("product-management-request-submit", { methods: ["POST"], authLevel: "anonymous", route: "product-management/requests", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementSubmit(request, dependencies) });
