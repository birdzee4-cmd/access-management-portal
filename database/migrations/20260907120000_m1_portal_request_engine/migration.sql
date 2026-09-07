BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Users] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [employeeId] NVARCHAR(50) NOT NULL,
    [entraObjectId] UNIQUEIDENTIFIER NOT NULL,
    [email] NVARCHAR(320) NOT NULL,
    [displayName] NVARCHAR(200) NOT NULL,
    [departmentId] UNIQUEIDENTIFIER,
    [managerId] UNIQUEIDENTIFIER,
    [active] BIT NOT NULL CONSTRAINT [Users_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Users_employeeId_key] UNIQUE NONCLUSTERED ([employeeId]),
    CONSTRAINT [Users_entraObjectId_key] UNIQUE NONCLUSTERED ([entraObjectId]),
    CONSTRAINT [Users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Departments] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Departments_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Departments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Departments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Departments_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [Departments_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Systems] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Systems_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Systems_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Systems_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Systems_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [Systems_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Applications] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Applications_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Applications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Applications_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Applications_systemId_code_key] UNIQUE NONCLUSTERED ([systemId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Roles] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [applicationId] UNIQUEIDENTIFIER,
    [contextId] UNIQUEIDENTIFIER,
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Roles_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Roles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Roles_systemId_applicationId_contextId_code_key] UNIQUE NONCLUSTERED ([systemId],[applicationId],[contextId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[AccessContexts] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [contextType] NVARCHAR(50) NOT NULL,
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [AccessContexts_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccessContexts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AccessContexts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AccessContexts_systemId_contextType_code_key] UNIQUE NONCLUSTERED ([systemId],[contextType],[code])
);

-- CreateTable
CREATE TABLE [dbo].[Permissions] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [applicationId] UNIQUEIDENTIFIER,
    [code] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [Permissions_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Permissions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Permissions_systemId_applicationId_code_key] UNIQUE NONCLUSTERED ([systemId],[applicationId],[code])
);

-- CreateTable
CREATE TABLE [dbo].[RolePermissions] (
    [roleId] UNIQUEIDENTIFIER NOT NULL,
    [permissionId] UNIQUEIDENTIFIER NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RolePermissions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RolePermissions_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[ApprovalRules] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [ruleCode] NVARCHAR(100) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [ApprovalRules_version_df] DEFAULT 1,
    [departmentId] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [applicationId] UNIQUEIDENTIFIER,
    [roleId] UNIQUEIDENTIFIER,
    [contextId] UNIQUEIDENTIFIER,
    [sourceId] UNIQUEIDENTIFIER,
    [approvalLevel] INT NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [ApprovalRules_active_df] DEFAULT 1,
    [effectiveFrom] DATETIME2,
    [effectiveTo] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApprovalRules_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ApprovalRules_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ApprovalRules_ruleCode_version_approvalLevel_key] UNIQUE NONCLUSTERED ([ruleCode],[version],[approvalLevel])
);

-- CreateTable
CREATE TABLE [dbo].[ApprovalRuleApprovers] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [approvalRuleId] UNIQUEIDENTIFIER NOT NULL,
    [approverId] UNIQUEIDENTIFIER,
    [approverReference] NVARCHAR(320) NOT NULL,
    [sequence] INT,
    [active] BIT NOT NULL CONSTRAINT [ApprovalRuleApprovers_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ApprovalRuleApprovers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ApprovalRuleApprovers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LegacySources] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [code] NVARCHAR(100) NOT NULL,
    [sourceSystem] NVARCHAR(100) NOT NULL,
    [sourceObject] NVARCHAR(300) NOT NULL,
    [systemId] UNIQUEIDENTIFIER,
    [contextId] UNIQUEIDENTIFIER,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [LegacySources_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LegacySources_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LegacySources_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LegacySources_code_key] UNIQUE NONCLUSTERED ([code]),
    CONSTRAINT [LegacySources_sourceSystem_sourceObject_key] UNIQUE NONCLUSTERED ([sourceSystem],[sourceObject])
);

-- CreateTable
CREATE TABLE [dbo].[LegacyApprovalMappings] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [sourceId] UNIQUEIDENTIFIER NOT NULL,
    [sourceRecordKey] NVARCHAR(200),
    [sourceRecordFingerprint] NVARCHAR(128),
    [originalRoleName] NVARCHAR(500),
    [originalDepartment] NVARCHAR(500),
    [originalManagerReference] NVARCHAR(500),
    [originalActiveValue] NVARCHAR(100),
    [normalizedRoleName] NVARCHAR(500),
    [normalizedDepartment] NVARCHAR(500),
    [normalizedManagerRef] NVARCHAR(500),
    [mappingStatus] NVARCHAR(40) NOT NULL CONSTRAINT [LegacyApprovalMappings_mappingStatus_df] DEFAULT 'UNRESOLVED',
    [systemId] UNIQUEIDENTIFIER,
    [roleId] UNIQUEIDENTIFIER,
    [departmentId] UNIQUEIDENTIFIER,
    [contextId] UNIQUEIDENTIFIER,
    [approvalRuleId] UNIQUEIDENTIFIER,
    [approvalRuleApproverId] UNIQUEIDENTIFIER,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LegacyApprovalMappings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [LegacyApprovalMappings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AccessRequests] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [requestNumber] NVARCHAR(30) NOT NULL,
    [requesterId] UNIQUEIDENTIFIER NOT NULL,
    [targetUserId] UNIQUEIDENTIFIER NOT NULL,
    [requestType] NVARCHAR(20) NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [effectiveDate] DATE,
    [expirationDate] DATE,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [AccessRequests_status_df] DEFAULT 'DRAFT',
    [version] INT NOT NULL CONSTRAINT [AccessRequests_version_df] DEFAULT 1,
    [idempotencyKey] NVARCHAR(100) NOT NULL,
    [payloadHash] NVARCHAR(64) NOT NULL,
    [submittedAt] DATETIME2 NOT NULL,
    [metadata] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccessRequests_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AccessRequests_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AccessRequests_requestNumber_key] UNIQUE NONCLUSTERED ([requestNumber]),
    CONSTRAINT [AccessRequests_requesterId_idempotencyKey_key] UNIQUE NONCLUSTERED ([requesterId],[idempotencyKey])
);

-- CreateTable
CREATE TABLE [dbo].[AccessRequestItems] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [accessRequestId] UNIQUEIDENTIFIER NOT NULL,
    [systemId] UNIQUEIDENTIFIER NOT NULL,
    [applicationId] UNIQUEIDENTIFIER,
    [roleId] UNIQUEIDENTIFIER,
    [currentRoleId] UNIQUEIDENTIFIER,
    [permissionId] UNIQUEIDENTIFIER,
    [contextId] UNIQUEIDENTIFIER,
    [action] NVARCHAR(20) NOT NULL,
    [currentValue] NVARCHAR(max),
    [requestedValue] NVARCHAR(max),
    [catalogSnapshot] NVARCHAR(max),
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [AccessRequestItems_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccessRequestItems_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AccessRequestItems_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Approvals] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [accessRequestId] UNIQUEIDENTIFIER NOT NULL,
    [approverId] UNIQUEIDENTIFIER NOT NULL,
    [approvalRuleId] UNIQUEIDENTIFIER,
    [approvalLevel] INT NOT NULL,
    [status] NVARCHAR(30) NOT NULL CONSTRAINT [Approvals_status_df] DEFAULT 'PENDING',
    [comment] NVARCHAR(2000),
    [ruleSnapshot] NVARCHAR(max),
    [approverSnapshot] NVARCHAR(500),
    [decidedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Approvals_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Approvals_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Approvals_accessRequestId_approvalLevel_approverId_key] UNIQUE NONCLUSTERED ([accessRequestId],[approvalLevel],[approverId])
);

-- CreateTable
CREATE TABLE [dbo].[ExternalReferences] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [entityType] NVARCHAR(50) NOT NULL,
    [entityId] NVARCHAR(100) NOT NULL,
    [externalSystem] NVARCHAR(50) NOT NULL,
    [externalScope] NVARCHAR(100) NOT NULL CONSTRAINT [ExternalReferences_externalScope_df] DEFAULT 'DEFAULT',
    [externalId] NVARCHAR(200) NOT NULL,
    [externalUrl] NVARCHAR(1000),
    [metadata] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExternalReferences_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ExternalReferences_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExternalReferences_externalSystem_externalScope_externalId_key] UNIQUE NONCLUSTERED ([externalSystem],[externalScope],[externalId])
);

-- CreateTable
CREATE TABLE [dbo].[AutomationJobs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [accessRequestItemId] UNIQUEIDENTIFIER NOT NULL,
    [connector] NVARCHAR(100) NOT NULL,
    [operation] NVARCHAR(40) NOT NULL,
    [status] NVARCHAR(40) NOT NULL CONSTRAINT [AutomationJobs_status_df] DEFAULT 'PENDING',
    [attemptCount] INT NOT NULL CONSTRAINT [AutomationJobs_attemptCount_df] DEFAULT 0,
    [startedAt] DATETIME2,
    [completedAt] DATETIME2,
    [errorMessage] NVARCHAR(max),
    [correlationId] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AutomationJobs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AutomationJobs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLogs] (
    [id] UNIQUEIDENTIFIER NOT NULL,
    [occurredAt] DATETIME2 NOT NULL CONSTRAINT [AuditLogs_occurredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [actorId] UNIQUEIDENTIFIER,
    [actor] NVARCHAR(320) NOT NULL,
    [targetUserId] UNIQUEIDENTIFIER,
    [action] NVARCHAR(100) NOT NULL,
    [entityType] NVARCHAR(50) NOT NULL,
    [entityId] NVARCHAR(100) NOT NULL,
    [systemId] UNIQUEIDENTIFIER,
    [beforeValue] NVARCHAR(max),
    [afterValue] NVARCHAR(max),
    [result] NVARCHAR(40) NOT NULL,
    [connector] NVARCHAR(100),
    [errorMessage] NVARCHAR(max),
    [correlationId] NVARCHAR(100),
    CONSTRAINT [AuditLogs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_departmentId_active_idx] ON [dbo].[Users]([departmentId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_managerId_idx] ON [dbo].[Users]([managerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Users_active_idx] ON [dbo].[Users]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Departments_active_idx] ON [dbo].[Departments]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Systems_active_idx] ON [dbo].[Systems]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Applications_systemId_active_idx] ON [dbo].[Applications]([systemId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Roles_systemId_contextId_active_idx] ON [dbo].[Roles]([systemId], [contextId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Roles_applicationId_idx] ON [dbo].[Roles]([applicationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Roles_contextId_idx] ON [dbo].[Roles]([contextId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessContexts_systemId_active_idx] ON [dbo].[AccessContexts]([systemId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Permissions_systemId_active_idx] ON [dbo].[Permissions]([systemId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Permissions_applicationId_idx] ON [dbo].[Permissions]([applicationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RolePermissions_permissionId_idx] ON [dbo].[RolePermissions]([permissionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRules_departmentId_systemId_contextId_roleId_active_approvalLevel_idx] ON [dbo].[ApprovalRules]([departmentId], [systemId], [contextId], [roleId], [active], [approvalLevel]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRules_applicationId_active_idx] ON [dbo].[ApprovalRules]([applicationId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRules_sourceId_idx] ON [dbo].[ApprovalRules]([sourceId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRuleApprovers_approvalRuleId_active_sequence_idx] ON [dbo].[ApprovalRuleApprovers]([approvalRuleId], [active], [sequence]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRuleApprovers_approverId_active_idx] ON [dbo].[ApprovalRuleApprovers]([approverId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ApprovalRuleApprovers_approverReference_idx] ON [dbo].[ApprovalRuleApprovers]([approverReference]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacySources_systemId_active_idx] ON [dbo].[LegacySources]([systemId], [active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacySources_contextId_idx] ON [dbo].[LegacySources]([contextId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_sourceId_sourceRecordKey_idx] ON [dbo].[LegacyApprovalMappings]([sourceId], [sourceRecordKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_sourceId_sourceRecordFingerprint_idx] ON [dbo].[LegacyApprovalMappings]([sourceId], [sourceRecordFingerprint]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_systemId_roleId_contextId_idx] ON [dbo].[LegacyApprovalMappings]([systemId], [roleId], [contextId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_departmentId_approvalRuleId_idx] ON [dbo].[LegacyApprovalMappings]([departmentId], [approvalRuleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_approvalRuleApproverId_idx] ON [dbo].[LegacyApprovalMappings]([approvalRuleApproverId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LegacyApprovalMappings_mappingStatus_idx] ON [dbo].[LegacyApprovalMappings]([mappingStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequests_status_createdAt_idx] ON [dbo].[AccessRequests]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequests_requesterId_createdAt_idx] ON [dbo].[AccessRequests]([requesterId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequests_targetUserId_status_createdAt_idx] ON [dbo].[AccessRequests]([targetUserId], [status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_accessRequestId_status_idx] ON [dbo].[AccessRequestItems]([accessRequestId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_systemId_status_idx] ON [dbo].[AccessRequestItems]([systemId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_applicationId_idx] ON [dbo].[AccessRequestItems]([applicationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_roleId_status_idx] ON [dbo].[AccessRequestItems]([roleId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_currentRoleId_idx] ON [dbo].[AccessRequestItems]([currentRoleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_permissionId_idx] ON [dbo].[AccessRequestItems]([permissionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AccessRequestItems_contextId_status_idx] ON [dbo].[AccessRequestItems]([contextId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approvals_accessRequestId_approvalLevel_status_idx] ON [dbo].[Approvals]([accessRequestId], [approvalLevel], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approvals_approverId_status_createdAt_idx] ON [dbo].[Approvals]([approverId], [status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Approvals_approvalRuleId_idx] ON [dbo].[Approvals]([approvalRuleId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalReferences_entityType_entityId_idx] ON [dbo].[ExternalReferences]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalReferences_externalSystem_externalId_idx] ON [dbo].[ExternalReferences]([externalSystem], [externalId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AutomationJobs_accessRequestItemId_status_idx] ON [dbo].[AutomationJobs]([accessRequestItemId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AutomationJobs_status_createdAt_idx] ON [dbo].[AutomationJobs]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AutomationJobs_correlationId_idx] ON [dbo].[AutomationJobs]([correlationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_occurredAt_idx] ON [dbo].[AuditLogs]([occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_actorId_occurredAt_idx] ON [dbo].[AuditLogs]([actorId], [occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_targetUserId_occurredAt_idx] ON [dbo].[AuditLogs]([targetUserId], [occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_entityType_entityId_occurredAt_idx] ON [dbo].[AuditLogs]([entityType], [entityId], [occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_systemId_occurredAt_idx] ON [dbo].[AuditLogs]([systemId], [occurredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLogs_correlationId_idx] ON [dbo].[AuditLogs]([correlationId]);

-- AddForeignKey
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Users] ADD CONSTRAINT [Users_managerId_fkey] FOREIGN KEY ([managerId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Applications] ADD CONSTRAINT [Applications_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Roles] ADD CONSTRAINT [Roles_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Roles] ADD CONSTRAINT [Roles_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[Applications]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Roles] ADD CONSTRAINT [Roles_contextId_fkey] FOREIGN KEY ([contextId]) REFERENCES [dbo].[AccessContexts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessContexts] ADD CONSTRAINT [AccessContexts_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Permissions] ADD CONSTRAINT [Permissions_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Permissions] ADD CONSTRAINT [Permissions_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[Applications]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermissions] ADD CONSTRAINT [RolePermissions_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RolePermissions] ADD CONSTRAINT [RolePermissions_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permissions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[Applications]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_contextId_fkey] FOREIGN KEY ([contextId]) REFERENCES [dbo].[AccessContexts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRules] ADD CONSTRAINT [ApprovalRules_sourceId_fkey] FOREIGN KEY ([sourceId]) REFERENCES [dbo].[LegacySources]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRuleApprovers] ADD CONSTRAINT [ApprovalRuleApprovers_approvalRuleId_fkey] FOREIGN KEY ([approvalRuleId]) REFERENCES [dbo].[ApprovalRules]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ApprovalRuleApprovers] ADD CONSTRAINT [ApprovalRuleApprovers_approverId_fkey] FOREIGN KEY ([approverId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacySources] ADD CONSTRAINT [LegacySources_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacySources] ADD CONSTRAINT [LegacySources_contextId_fkey] FOREIGN KEY ([contextId]) REFERENCES [dbo].[AccessContexts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_sourceId_fkey] FOREIGN KEY ([sourceId]) REFERENCES [dbo].[LegacySources]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Departments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_contextId_fkey] FOREIGN KEY ([contextId]) REFERENCES [dbo].[AccessContexts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_approvalRuleId_fkey] FOREIGN KEY ([approvalRuleId]) REFERENCES [dbo].[ApprovalRules]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LegacyApprovalMappings] ADD CONSTRAINT [LegacyApprovalMappings_approvalRuleApproverId_fkey] FOREIGN KEY ([approvalRuleApproverId]) REFERENCES [dbo].[ApprovalRuleApprovers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_requesterId_fkey] FOREIGN KEY ([requesterId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_targetUserId_fkey] FOREIGN KEY ([targetUserId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_accessRequestId_fkey] FOREIGN KEY ([accessRequestId]) REFERENCES [dbo].[AccessRequests]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_applicationId_fkey] FOREIGN KEY ([applicationId]) REFERENCES [dbo].[Applications]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_currentRoleId_fkey] FOREIGN KEY ([currentRoleId]) REFERENCES [dbo].[Roles]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[Permissions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_contextId_fkey] FOREIGN KEY ([contextId]) REFERENCES [dbo].[AccessContexts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approvals] ADD CONSTRAINT [Approvals_accessRequestId_fkey] FOREIGN KEY ([accessRequestId]) REFERENCES [dbo].[AccessRequests]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approvals] ADD CONSTRAINT [Approvals_approverId_fkey] FOREIGN KEY ([approverId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Approvals] ADD CONSTRAINT [Approvals_approvalRuleId_fkey] FOREIGN KEY ([approvalRuleId]) REFERENCES [dbo].[ApprovalRules]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AutomationJobs] ADD CONSTRAINT [AutomationJobs_accessRequestItemId_fkey] FOREIGN KEY ([accessRequestItemId]) REFERENCES [dbo].[AccessRequestItems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_targetUserId_fkey] FOREIGN KEY ([targetUserId]) REFERENCES [dbo].[Users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLogs] ADD CONSTRAINT [AuditLogs_systemId_fkey] FOREIGN KEY ([systemId]) REFERENCES [dbo].[Systems]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- M1 fail-closed domain constraints. Prisma validates the same rules before writes.
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_requestType_check]
  CHECK ([requestType] IN ('ADD', 'REMOVE', 'CHANGE'));
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_status_check]
  CHECK ([status] IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'));
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_version_check]
  CHECK ([version] >= 1);
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_reason_check]
  CHECK (LEN(LTRIM(RTRIM([reason]))) BETWEEN 10 AND 1000);
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_idempotency_check]
  CHECK (LEN([idempotencyKey]) = 36);
ALTER TABLE [dbo].[AccessRequests] ADD CONSTRAINT [AccessRequests_payloadHash_check]
  CHECK (LEN([payloadHash]) = 64 AND [payloadHash] NOT LIKE '%[^0-9a-f]%');
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_action_check]
  CHECK ([action] IN ('ADD', 'REMOVE', 'CHANGE'));
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_status_check]
  CHECK ([status] IN ('PENDING', 'APPROVED', 'REJECTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'));
ALTER TABLE [dbo].[AccessRequestItems] ADD CONSTRAINT [AccessRequestItems_role_shape_check]
  CHECK (([action] = 'ADD' AND [currentRoleId] IS NULL AND [roleId] IS NOT NULL)
    OR ([action] = 'REMOVE' AND [currentRoleId] IS NOT NULL AND [roleId] IS NULL)
    OR ([action] = 'CHANGE' AND [currentRoleId] IS NOT NULL AND [roleId] IS NOT NULL AND [currentRoleId] <> [roleId]));

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
