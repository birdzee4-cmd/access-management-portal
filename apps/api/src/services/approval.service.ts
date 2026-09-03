import type { ApprovalRepository } from "@access-portal/database";

/** Query boundary for approval persistence; no approval workflow is implemented here. */
export class ApprovalService {
  constructor(private readonly approvals: ApprovalRepository) {}

  listForRequest(accessRequestId: string) {
    return this.approvals.listForRequest(accessRequestId);
  }

  listPendingForApprover(approverId: string) {
    return this.approvals.listPendingForApprover(approverId);
  }
}
