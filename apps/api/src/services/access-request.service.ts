import type {
  AccessRequestRepository,
  ExternalReferenceRepository,
} from "@access-portal/database";

export interface AccessRequestServiceDependencies {
  readonly accessRequests: AccessRequestRepository;
  readonly externalReferences: ExternalReferenceRepository;
}

/** Read-oriented boundary for request persistence; workflow behavior is intentionally absent. */
export class AccessRequestService {
  constructor(private readonly repositories: AccessRequestServiceDependencies) {}

  findByRequestNumber(requestNumber: string) {
    return this.repositories.accessRequests.findByRequestNumber(requestNumber);
  }

  listForTargetUser(targetUserId: string) {
    return this.repositories.accessRequests.listByTargetUser(targetUserId);
  }

  listExternalReferences(accessRequestId: string) {
    return this.repositories.externalReferences.listForEntity(
      "ACCESS_REQUEST",
      accessRequestId,
    );
  }
}
