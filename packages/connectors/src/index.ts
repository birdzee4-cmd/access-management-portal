import type {
  LegacyAccessQuery,
  LegacyAccessRecord,
  ReadPage,
} from "@access-portal/contracts";

/** Query-only boundary for every legacy integration in the pilot. */
export interface ReadOnlyLegacyConnector {
  readonly source: "AZURE_DEVOPS" | "SHAREPOINT" | "LEGACY_SQL";

  getAccessRecord(externalId: string): Promise<LegacyAccessRecord | null>;

  listAccessRecords(query: LegacyAccessQuery): Promise<ReadPage<LegacyAccessRecord>>;
}

/** Marker used while all real external clients remain intentionally unimplemented. */
export const LIVE_LEGACY_CONNECTORS_ENABLED = false as const;
