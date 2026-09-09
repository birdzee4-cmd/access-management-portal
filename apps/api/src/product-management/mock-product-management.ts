import type {
  ProductManagementFormDefinition,
  ProductManagementRequest,
  ProductManagementRequestListResponse,
  ProductManagementRequestSubmission,
  ProductManagementRequestSubmissionResponse,
} from "@access-portal/contracts";
import {
  isSupportedProductManagementContext,
  normalizeProductManagementCustomerEmails,
  productManagementCountries,
  productManagementForm,
  productManagementOwnerDecisions,
  productManagementPhase1ApprovalArchitecture,
  productManagementSchemaRegistry,
  productManagementTopics,
} from "./product-management-model.js";

export {
  isSupportedProductManagementContext,
  normalizeProductManagementCustomerEmails,
  productManagementCountries,
  productManagementOwnerDecisions,
  productManagementPhase1ApprovalArchitecture,
  productManagementSchemaRegistry,
  productManagementTopics,
};

const requests: readonly ProductManagementRequest[] = [
  {
    id: "pm-mock-001",
    requestId: "PM-1001",
    system: "Product Management",
    country: "Thailand",
    topic: "Create New Account (ลูกค้าใหม่)",
    requester: "Demo Requester",
    createdDate: "2026-09-07T09:00:00.000Z",
    status: "SUBMITTED",
    workId: "WORK-501",
    fields: { companyName: "Synthetic Company" },
  },
  {
    id: "pm-mock-002",
    requestId: "PM-1002",
    system: "Product Management",
    country: "Vietnam",
    topic: "เพิ่ม App เข้า Account(ลูกค้า)",
    requester: "Demo Requester",
    createdDate: "2026-09-08T08:30:00.000Z",
    status: "DRAFT",
    workId: null,
    fields: { account: "VN Synthetic Account", appName: "VN Synthetic App" },
  },
];

export function listMockProductManagementRequests(): ProductManagementRequestListResponse {
  return { source: "MOCK", requests };
}

export function mockProductManagementForm(country: string, topic: string): ProductManagementFormDefinition {
  return productManagementForm(country, topic);
}

export function submitMockProductManagementRequest(
  input: ProductManagementRequestSubmission,
  requester: string,
): ProductManagementRequestSubmissionResponse {
  if (!isSupportedProductManagementContext(input.country, input.topic)) {
    throw new Error("INVALID_PRODUCT_MANAGEMENT_CONTEXT");
  }
  const form = productManagementForm(input.country, input.topic);
  if (form.schema.implementationStatus !== "CONFIRMED") {
    throw new Error("PRODUCT_MANAGEMENT_SCHEMA_NOT_CONFIRMED");
  }
  if (!form.schema.submissionEnabled) throw new Error("PRODUCT_MANAGEMENT_SUBMISSION_DISABLED");
  return {
    source: "MOCK",
    replayed: false,
    request: {
      id: "pm-mock-submission",
      requestId: "PM-MOCK-SUBMISSION",
      system: "Product Management",
      country: input.country,
      topic: input.topic,
      requester,
      createdDate: "2026-09-08T00:00:00.000Z",
      status: "SUBMITTED",
      workId: null,
      fields: input.fields,
    },
  };
}
