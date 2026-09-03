export interface RequestRow {
  readonly requestNumber: string;
  readonly targetUser: string;
  readonly system: string;
  readonly requestType: "ADD" | "REMOVE" | "CHANGE";
  readonly role: string;
  readonly status: "Pending approval" | "In progress" | "Completed" | "Draft";
  readonly created: string;
}

export interface ApprovalRow {
  readonly request: string;
  readonly requester: string;
  readonly targetUser: string;
  readonly system: string;
  readonly role: string;
  readonly action: string;
  readonly requestedDate: string;
  readonly status: "Pending";
}

export const myRequests: readonly RequestRow[] = [
  {
    requestNumber: "AR-DEMO-1004",
    targetUser: "Jordan Example",
    system: "Azure DevOps",
    requestType: "ADD",
    role: "Contributor",
    status: "Pending approval",
    created: "03 Sep 2026",
  },
  {
    requestNumber: "AR-DEMO-1003",
    targetUser: "Jordan Example",
    system: "WMS",
    requestType: "CHANGE",
    role: "Operator",
    status: "In progress",
    created: "01 Sep 2026",
  },
  {
    requestNumber: "AR-DEMO-1002",
    targetUser: "Casey Sample",
    system: "OMS",
    requestType: "REMOVE",
    role: "Viewer",
    status: "Completed",
    created: "28 Aug 2026",
  },
  {
    requestNumber: "AR-DEMO-1001",
    targetUser: "Taylor Demo",
    system: "Azure DevOps",
    requestType: "ADD",
    role: "Reader",
    status: "Draft",
    created: "27 Aug 2026",
  },
];

export const pendingApprovals: readonly ApprovalRow[] = [
  {
    request: "AR-DEMO-1010",
    requester: "Morgan Example",
    targetUser: "Avery Sample",
    system: "Azure DevOps",
    role: "Reader",
    action: "Add",
    requestedDate: "03 Sep 2026",
    status: "Pending",
  },
  {
    request: "AR-DEMO-1009",
    requester: "Riley Demo",
    targetUser: "Cameron Example",
    system: "WMS",
    role: "Operator",
    action: "Change",
    requestedDate: "02 Sep 2026",
    status: "Pending",
  },
  {
    request: "AR-DEMO-1008",
    requester: "Jamie Sample",
    targetUser: "Quinn Demo",
    system: "OMS",
    role: "Viewer",
    action: "Remove",
    requestedDate: "01 Sep 2026",
    status: "Pending",
  },
];

export const catalogEntries = [
  {
    system: "Azure DevOps",
    application: "Project workspace",
    role: "Reader",
    description: "View work items, boards, and project reporting.",
    risk: "Low",
    status: "Active",
  },
  {
    system: "Azure DevOps",
    application: "Project workspace",
    role: "Contributor",
    description: "Create and update project work items.",
    risk: "Medium",
    status: "Active",
  },
  {
    system: "Azure DevOps",
    application: "Organization",
    role: "Administrator",
    description: "Administrative access reserved for controlled use.",
    risk: "High",
    status: "Pilot",
  },
  {
    system: "WMS",
    application: "Warehouse operations",
    role: "Viewer",
    description: "Read-only access to example warehouse information.",
    risk: "Low",
    status: "Draft",
  },
  {
    system: "WMS",
    application: "Warehouse operations",
    role: "Operator",
    description: "Future operational role; no provisioning is connected.",
    risk: "Medium",
    status: "Draft",
  },
  {
    system: "OMS",
    application: "Order operations",
    role: "Viewer",
    description: "Read-only access to example order information.",
    risk: "Low",
    status: "Draft",
  },
  {
    system: "OMS",
    application: "Order operations",
    role: "Operator",
    description: "Future operational role; no provisioning is connected.",
    risk: "Medium",
    status: "Draft",
  },
] as const;

export const fakeUsers = [
  {
    employee: "Avery Sample",
    email: "avery.sample@example.invalid",
    department: "Demo Technology",
    manager: "Morgan Example",
    status: "Active",
  },
  {
    employee: "Cameron Example",
    email: "cameron.example@example.invalid",
    department: "Example Operations",
    manager: "Riley Demo",
    status: "Active",
  },
  {
    employee: "Quinn Demo",
    email: "quinn.demo@example.invalid",
    department: "Sample Finance",
    manager: "Jamie Sample",
    status: "Inactive",
  },
] as const;

export const legacyRequests = [
  {
    legacyId: "LEG-DEMO-3003",
    created: "03 Sep 2026",
    employee: "Avery Sample",
    department: "Demo Technology",
    requestType: "Example access request",
    managerStatus: "Approved",
    workId: "ADO-DEMO-7003",
    vstsStatus: "Active",
  },
  {
    legacyId: "LEG-DEMO-3002",
    created: "02 Sep 2026",
    employee: "Cameron Example",
    department: "Example Operations",
    requestType: "Example service request",
    managerStatus: "Pending",
    workId: "ADO-DEMO-7002",
    vstsStatus: "New",
  },
] as const;

export const automationJobs = [
  {
    job: "JOB-DEMO-001",
    request: "AR-DEMO-1003",
    connector: "DEMO_CONNECTOR",
    operation: "VERIFY_ACCESS",
    status: "Disabled",
    attempts: "0",
    updated: "Not started",
  },
] as const;

export const auditEvents = [
  {
    timestamp: "03 Sep 2026, 09:42",
    actor: "Morgan Example",
    target: "Avery Sample",
    action: "REQUEST_SUBMITTED",
    system: "Azure DevOps",
    result: "Success",
    correlationId: "corr-demo-1004",
  },
  {
    timestamp: "02 Sep 2026, 14:18",
    actor: "Riley Demo",
    target: "Cameron Example",
    action: "APPROVAL_RECORDED",
    system: "WMS",
    result: "Success",
    correlationId: "corr-demo-1003",
  },
] as const;
