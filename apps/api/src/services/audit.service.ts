import type { AuditLogAppendInput, AuditLogRepository } from "@access-portal/database";

/** Append-only service boundary for auditable portal events. */
export class AuditService {
  constructor(private readonly auditLogs: AuditLogRepository) {}

  record(entry: AuditLogAppendInput) {
    return this.auditLogs.append(entry);
  }
}
