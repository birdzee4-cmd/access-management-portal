import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { getRuntimeAuthenticationService } from "../auth/index.js";
import { handleProductManagementCountries, handleProductManagementForm, handleProductManagementList, handleProductManagementLookup, handleProductManagementSubmit, handleProductManagementTopics } from "../product-management/product-management-api.js";
import { createProductManagementMasterDataService } from "../product-management/product-management-master-data.js";

const dependencies = { getAuthenticationService: getRuntimeAuthenticationService, getMasterDataService: () => createProductManagementMasterDataService(process.env) };
app.http("product-management-request-list", { methods: ["GET"], authLevel: "anonymous", route: "product-management/requests", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementList(request, dependencies) });
app.http("product-management-countries", { methods: ["GET"], authLevel: "anonymous", route: "product-management/countries", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementCountries(request, dependencies) });
app.http("product-management-topics", { methods: ["GET"], authLevel: "anonymous", route: "product-management/countries/{country}/topics", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementTopics(request, dependencies) });
app.http("product-management-form", { methods: ["GET"], authLevel: "anonymous", route: "product-management/forms/{country}/{topic}", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementForm(request, dependencies) });
app.http("product-management-lookup", { methods: ["GET"], authLevel: "anonymous", route: "product-management/lookups/{lookup}", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementLookup(request, dependencies) });
app.http("product-management-request-submit", { methods: ["POST"], authLevel: "anonymous", route: "product-management/requests", handler: (request: HttpRequest, _context: InvocationContext) => handleProductManagementSubmit(request, dependencies) });
