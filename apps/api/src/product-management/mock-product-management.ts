import type { ProductManagementFormDefinition, ProductManagementRequest, ProductManagementRequestListResponse, ProductManagementRequestSubmission, ProductManagementRequestSubmissionResponse } from "@access-portal/contracts";

const requests: readonly ProductManagementRequest[] = [
  { id: "pm-mock-001", requestId: "PM-1001", system: "Product Management", country: "Thailand", topic: "New Product", requester: "Demo Requester", createdDate: "2026-09-07T09:00:00.000Z", status: "SUBMITTED", workId: "WORK-501", fields: { productName: "Demo product" } },
  { id: "pm-mock-002", requestId: "PM-1002", system: "Product Management", country: "Vietnam", topic: "Product Change", requester: "Demo Requester", createdDate: "2026-09-08T08:30:00.000Z", status: "DRAFT", workId: null, fields: { changeSummary: "Demo change" } },
];
export const productManagementCountries = ["Thailand", "Vietnam"] as const;
export const productManagementTopics = ["New Product", "Product Change"] as const;
export function isSupportedProductManagementContext(country: string, topic: string): boolean { return (productManagementCountries as readonly string[]).includes(country) && (productManagementTopics as readonly string[]).includes(topic); }
export function listMockProductManagementRequests(): ProductManagementRequestListResponse { return { source: "MOCK", requests }; }
export function mockProductManagementForm(country: string, topic: string): ProductManagementFormDefinition {
  if (!isSupportedProductManagementContext(country, topic)) throw new Error("INVALID_PRODUCT_MANAGEMENT_CONTEXT");
  const fields = topic === "New Product" ? [{ key: "productName", label: "Product name", required: true, type: "text" as const }, { key: "description", label: "Description", required: true, type: "textarea" as const }, { key: "priority", label: "Priority", required: false, type: "select" as const, options: ["Normal", "High"] }] : [{ key: "changeSummary", label: "Change summary", required: true, type: "textarea" as const }, { key: "releaseType", label: "Release type", required: true, type: "select" as const, options: ["Standard", "Urgent"] }];
  return { country, topic, fields };
}
export function submitMockProductManagementRequest(input: ProductManagementRequestSubmission, requester: string): ProductManagementRequestSubmissionResponse {
  if (!isSupportedProductManagementContext(input.country, input.topic)) throw new Error("INVALID_PRODUCT_MANAGEMENT_CONTEXT");
  return { source: "MOCK", replayed: false, request: { id: "pm-mock-submission", requestId: "PM-MOCK-SUBMISSION", system: "Product Management", country: input.country, topic: input.topic, requester, createdDate: "2026-09-08T00:00:00.000Z", status: "SUBMITTED", workId: null, fields: input.fields } };
}
