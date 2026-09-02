import type { LegacyIntegrationMode } from "@access-portal/contracts";

const disabledCapabilityKeys = [
  "ENABLE_SHAREPOINT_WRITE",
  "ENABLE_LEGACY_SQL_WRITE",
  "ENABLE_VSTS_WRITE",
  "ENABLE_ACCESS_PROVISIONING",
  "ENABLE_ACCESS_REVOCATION",
  "ENABLE_AUTOMATION",
] as const;

type DisabledCapabilityKey = (typeof disabledCapabilityKeys)[number];

export interface LegacySafetyPolicy {
  readonly legacyIntegrationMode: LegacyIntegrationMode;
  readonly disabledCapabilities: Readonly<Record<DisabledCapabilityKey, false>>;
}

export function readLegacySafetyPolicy(
  environment: Readonly<Record<string, string | undefined>>,
): LegacySafetyPolicy {
  if (environment.LEGACY_INTEGRATION_MODE !== "READ_ONLY") {
    throw new Error("LEGACY_INTEGRATION_MODE must be READ_ONLY.");
  }

  const disabledCapabilities = {} as Record<DisabledCapabilityKey, false>;

  for (const key of disabledCapabilityKeys) {
    if (environment[key] !== "false") {
      throw new Error(`${key} must be explicitly set to false.`);
    }

    disabledCapabilities[key] = false;
  }

  return {
    legacyIntegrationMode: "READ_ONLY",
    disabledCapabilities,
  };
}
