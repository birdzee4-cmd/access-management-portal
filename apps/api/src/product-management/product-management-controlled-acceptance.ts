import {
  ProductManagementCompatibilityPreviewService,
  serializeProductManagementCompatibilityPayload,
  validateProductManagementCompatibilityPayload,
  type LegacyProductManagementFieldName,
  type LegacyProductManagementPayload,
  type ProductManagementCompatibilityInput,
  type ProductManagementCompatibilityPreview,
} from "./product-management-compatibility.js";
import { productManagementTopics } from "./product-management-model.js";
import {
  PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION,
  fingerprintProductManagementPayload,
  type ProductManagementAdapterFailure,
} from "./product-management-submission.js";

export const PRODUCT_MANAGEMENT_PM07_MARKER = "PORTAL-TEST-PM07" as const;
export const PRODUCT_MANAGEMENT_PM07_TOPIC = productManagementTopics[12];
export const PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET = Object.freeze({
  classification: "PRODUCTION_CONTROLLED_ACCEPTANCE",
  name: "LEGACY_PRODUCT_MANAGEMENT_SHAREPOINT_INTAKE",
} as const);

const REQUIRED_AUTHORIZATION = "AUTHORIZED_EXACTLY_ONE_REJECT_TEST";
const REQUIRED_REJECTION_INTENT = "REJECT_AT_FIRST_TEAMS_APPROVAL";
const REQUIRED_TARGET_ATTESTATION = "OFFLINE_POWER_APP_FLOW_TARGET_MATCH_VERIFIED";
const REQUIRED_LEAST_PRIVILEGE_ATTESTATION = "VERIFIED_BOUNDED_LIST_READ_WRITE";
const expectedListTitle = "USR_PowerApp";
const exactFingerprintPattern = /^sha256:[0-9a-f]{64}$/;
const exactGuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Environment = Readonly<Record<string, string | undefined>>;

export interface ProductManagementControlledAcceptanceConfiguration {
  readonly mode: "PM07_SINGLE_REJECT_TEST";
  readonly target: typeof PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET;
  readonly siteUrl: string;
  readonly listId: string;
  readonly listTitle: typeof expectedListTitle;
  readonly marker: typeof PRODUCT_MANAGEMENT_PM07_MARKER;
  readonly topic: typeof PRODUCT_MANAGEMENT_PM07_TOPIC;
  readonly expectedPayloadFingerprint: `sha256:${string}`;
  readonly idempotencyKey: string;
  readonly approvedRequesterEmail: string;
  readonly approvedAssignTo: string;
  readonly approvedCompany: string;
}

export interface ProductManagementControlledAcceptanceEnvelopeV1 {
  readonly schemaVersion: typeof PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION;
  readonly topic: typeof PRODUCT_MANAGEMENT_PM07_TOPIC;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: `sha256:${string}`;
  readonly payload: LegacyProductManagementPayload;
  readonly createdAt: string;
  readonly target: typeof PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET;
  readonly acceptanceMarker: typeof PRODUCT_MANAGEMENT_PM07_MARKER;
}

export interface ProductManagementControlledAcceptanceDryRun {
  readonly mode: "DRY_RUN";
  readonly preview: ProductManagementCompatibilityPreview;
  readonly envelope: ProductManagementControlledAcceptanceEnvelopeV1;
  readonly targetClassification: "PRODUCTION_CONTROLLED_ACCEPTANCE";
  readonly writeAllowed: false;
  readonly portalApprovalCreated: false;
  readonly automaticRetryAllowed: false;
}

export interface ProductManagementControlledAcceptanceTargetObservation {
  readonly listTitle: string;
  readonly baseTemplate: number;
  readonly hidden: boolean;
  readonly currentUserEmail: string;
  readonly currentUserDisplayName: string;
  readonly currentUserPrincipalType: number;
  readonly existingMarkerMatches: number;
  readonly fieldInternalNames: Readonly<Record<LegacyProductManagementFieldName, string>>;
}

export type ProductManagementControlledAcceptanceSubmitResult =
  | Readonly<{ status: "ACCEPTED_BY_ADAPTER"; downstreamReference: string }>
  | Readonly<{ status: "FAILED_BEFORE_CONFIRMED_WRITE"; failure: ProductManagementAdapterFailure }>
  | Readonly<{ status: "UNKNOWN_OUTCOME"; failure: ProductManagementAdapterFailure }>;

export type ProductManagementControlledAcceptanceVerificationResult =
  | Readonly<{ status: "VERIFIED"; downstreamReference: string }>
  | Readonly<{ status: "FAILED"; failure: ProductManagementAdapterFailure }>
  | Readonly<{ status: "UNAVAILABLE"; failure: ProductManagementAdapterFailure }>;

export interface ProductManagementControlledAcceptanceAdapter {
  readonly target: typeof PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET;
  readonly configuration: ProductManagementControlledAcceptanceConfiguration;
  readonly capabilities: Readonly<{
    submit: true;
    verify: true;
    reconcileByMarker: true;
    network: true;
    approve: false;
    reject: false;
    provision: false;
    revoke: false;
  }>;
  inspectTarget(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceTargetObservation>;
  submit(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceSubmitResult>;
  verify(envelope: ProductManagementControlledAcceptanceEnvelopeV1, downstreamReference: string): Promise<ProductManagementControlledAcceptanceVerificationResult>;
  reconcileByMarker(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceVerificationResult>;
}

export interface ProductManagementControlledAcceptanceExecutionResult {
  readonly state: "VERIFIED_PENDING_LEGACY_APPROVAL" | "FAILED" | "UNKNOWN_OUTCOME" | "ACCEPTED_UNVERIFIED";
  readonly dryRun: ProductManagementControlledAcceptanceDryRun;
  readonly targetObservation: ProductManagementControlledAcceptanceTargetObservation;
  readonly submitResult: ProductManagementControlledAcceptanceSubmitResult;
  readonly verification: ProductManagementControlledAcceptanceVerificationResult | null;
  readonly attempts: 1;
  readonly automaticRetries: 0;
  readonly portalApprovalCreated: false;
  readonly approvalBypassed: false;
  readonly provisioningPerformed: false;
  readonly rejectionPerformed: false;
}

export class ProductManagementControlledAcceptanceSafetyError extends Error {
  readonly code = "PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_SAFETY_VIOLATION" as const;
  constructor(message: string) {
    super(message);
    this.name = "ProductManagementControlledAcceptanceSafetyError";
  }
}

function required(environment: Environment, key: string): string {
  const value = environment[key]?.trim();
  if (!value) throw new ProductManagementControlledAcceptanceSafetyError(`${key} is required for controlled acceptance.`);
  return value;
}

function exactMetadata(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200 || /[\u0000-\u001f]/.test(normalized)) {
    throw new ProductManagementControlledAcceptanceSafetyError(`Invalid controlled-acceptance ${name}.`);
  }
  return normalized;
}

function approvedEmail(environment: Environment, key: string): string {
  const value = required(environment, key);
  if (!emailPattern.test(value) || value.toLowerCase().endsWith(".invalid")) {
    throw new ProductManagementControlledAcceptanceSafetyError(`${key} must be an approved deliverable email address.`);
  }
  return value;
}

export function readProductManagementControlledAcceptanceConfiguration(
  environment: Environment,
): ProductManagementControlledAcceptanceConfiguration {
  if ((environment.PRODUCT_MANAGEMENT_DATA_SOURCE?.trim().toLowerCase() || "mock") !== "mock" ||
      (environment.PRODUCT_MANAGEMENT_SUBMISSION_ENABLED?.trim().toLowerCase() || "false") !== "false" ||
      (environment.PRODUCT_MANAGEMENT_REAL_ADAPTER_ENABLED?.trim().toLowerCase() || "false") !== "false" ||
      (environment.PRODUCT_MANAGEMENT_ADAPTER_TARGET?.trim().toLowerCase() || "disabled") !== "disabled") {
    throw new ProductManagementControlledAcceptanceSafetyError("Normal Product Management runtime submission and its real-adapter route must remain disabled.");
  }
  if (required(environment, "PRODUCT_MANAGEMENT_PM07_MODE") !== "PM07_SINGLE_REJECT_TEST" ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_WRITE_AUTHORIZATION") !== REQUIRED_AUTHORIZATION ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_REJECTION_INTENT") !== REQUIRED_REJECTION_INTENT ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_TARGET_CLASSIFICATION") !== PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET.classification ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_TARGET_ATTESTATION") !== REQUIRED_TARGET_ATTESTATION ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_LEAST_PRIVILEGE_ATTESTATION") !== REQUIRED_LEAST_PRIVILEGE_ATTESTATION) {
    throw new ProductManagementControlledAcceptanceSafetyError("Controlled-acceptance authorization, rejection, target, or least-privilege attestation is invalid.");
  }

  let site: URL;
  try {
    site = new URL(required(environment, "PRODUCT_MANAGEMENT_PM07_SHAREPOINT_SITE_URL"));
  } catch {
    throw new ProductManagementControlledAcceptanceSafetyError("The controlled SharePoint site URL is invalid.");
  }
  if (site.protocol !== "https:" || site.username || site.password || site.search || site.hash) {
    throw new ProductManagementControlledAcceptanceSafetyError("The controlled SharePoint site URL must be an HTTPS site root without credentials, query, or fragment.");
  }
  if (!site.hostname.toLowerCase().endsWith(".sharepoint.com")) {
    throw new ProductManagementControlledAcceptanceSafetyError("The controlled adapter is pinned to an explicitly configured SharePoint Online host.");
  }
  const listId = required(environment, "PRODUCT_MANAGEMENT_PM07_SHAREPOINT_LIST_ID");
  if (!exactGuidPattern.test(listId)) throw new ProductManagementControlledAcceptanceSafetyError("The controlled SharePoint list ID must be an exact GUID.");
  if (required(environment, "PRODUCT_MANAGEMENT_PM07_SHAREPOINT_LIST_TITLE") !== expectedListTitle) {
    throw new ProductManagementControlledAcceptanceSafetyError("The controlled target must be the verified USR_PowerApp intake list.");
  }
  if (required(environment, "PRODUCT_MANAGEMENT_PM07_MARKER") !== PRODUCT_MANAGEMENT_PM07_MARKER ||
      required(environment, "PRODUCT_MANAGEMENT_PM07_TOPIC") !== PRODUCT_MANAGEMENT_PM07_TOPIC) {
    throw new ProductManagementControlledAcceptanceSafetyError("PM-07 is bounded to its exact marker and one low-risk Topic.");
  }
  const fingerprint = required(environment, "PRODUCT_MANAGEMENT_PM07_EXPECTED_PAYLOAD_FINGERPRINT");
  if (!exactFingerprintPattern.test(fingerprint)) throw new ProductManagementControlledAcceptanceSafetyError("The reviewed payload fingerprint must be an exact SHA-256 value.");

  return Object.freeze({
    mode: "PM07_SINGLE_REJECT_TEST",
    target: PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET,
    siteUrl: site.href.replace(/\/$/, ""),
    listId: listId.toLowerCase(),
    listTitle: expectedListTitle,
    marker: PRODUCT_MANAGEMENT_PM07_MARKER,
    topic: PRODUCT_MANAGEMENT_PM07_TOPIC,
    expectedPayloadFingerprint: fingerprint as `sha256:${string}`,
    idempotencyKey: exactMetadata(required(environment, "PRODUCT_MANAGEMENT_PM07_IDEMPOTENCY_KEY"), "idempotency key"),
    approvedRequesterEmail: approvedEmail(environment, "PRODUCT_MANAGEMENT_PM07_APPROVED_REQUESTER_EMAIL"),
    approvedAssignTo: approvedEmail(environment, "PRODUCT_MANAGEMENT_PM07_APPROVED_ASSIGN_TO"),
    approvedCompany: exactMetadata(required(environment, "PRODUCT_MANAGEMENT_PM07_APPROVED_COMPANY"), "company"),
  });
}

function exactUtcTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new ProductManagementControlledAcceptanceSafetyError("Controlled-acceptance createdAt must be an exact UTC ISO timestamp.");
  }
  return value;
}

function ensurePm07Input(input: ProductManagementCompatibilityInput): asserts input is Extract<ProductManagementCompatibilityInput, { topic: typeof PRODUCT_MANAGEMENT_PM07_TOPIC }> {
  if (input.topic !== PRODUCT_MANAGEMENT_PM07_TOPIC) {
    throw new ProductManagementControlledAcceptanceSafetyError("PM-07 is bounded to exactly one notification-setting Topic.");
  }
  if (input.fields.account.displayName !== PRODUCT_MANAGEMENT_PM07_MARKER) {
    throw new ProductManagementControlledAcceptanceSafetyError("The exact PM-07 marker must be the synthetic Account display value.");
  }
}

export function createProductManagementControlledAcceptanceDryRun(input: Readonly<{
  compatibilityInput: ProductManagementCompatibilityInput;
  correlationId: string;
  idempotencyKey: string;
  createdAt: string;
}>): ProductManagementControlledAcceptanceDryRun {
  ensurePm07Input(input.compatibilityInput);
  const preview = new ProductManagementCompatibilityPreviewService({}).preview(input.compatibilityInput);
  const payload = serializeProductManagementCompatibilityPayload(input.compatibilityInput);
  const validationErrors = validateProductManagementCompatibilityPayload(input.compatibilityInput, payload);
  if (validationErrors.length) throw new ProductManagementControlledAcceptanceSafetyError("The PM-07 compatibility payload did not pass exact validation.");
  if (!payload.Detail.includes(PRODUCT_MANAGEMENT_PM07_MARKER)) {
    throw new ProductManagementControlledAcceptanceSafetyError("The PM-07 marker must be present in Detail.");
  }
  const envelope = Object.freeze({
    schemaVersion: PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION,
    topic: PRODUCT_MANAGEMENT_PM07_TOPIC,
    correlationId: exactMetadata(input.correlationId, "correlation ID"),
    idempotencyKey: exactMetadata(input.idempotencyKey, "idempotency key"),
    payloadFingerprint: fingerprintProductManagementPayload(payload),
    payload: Object.freeze({ ...payload }),
    createdAt: exactUtcTimestamp(input.createdAt),
    target: PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET,
    acceptanceMarker: PRODUCT_MANAGEMENT_PM07_MARKER,
  } satisfies ProductManagementControlledAcceptanceEnvelopeV1);
  return Object.freeze({
    mode: "DRY_RUN",
    preview,
    envelope,
    targetClassification: "PRODUCTION_CONTROLLED_ACCEPTANCE",
    writeAllowed: false,
    portalApprovalCreated: false,
    automaticRetryAllowed: false,
  });
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

export class ProductManagementControlledAcceptanceRunner {
  private executionStarted = false;

  constructor(
    private readonly configuration: ProductManagementControlledAcceptanceConfiguration,
    private readonly adapter: ProductManagementControlledAcceptanceAdapter,
    private readonly now: () => string,
  ) {
    if (adapter.target !== PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET ||
        adapter.configuration !== configuration ||
        adapter.capabilities.network !== true || adapter.capabilities.approve !== false ||
        adapter.capabilities.reject !== false || adapter.capabilities.provision !== false ||
        adapter.capabilities.revoke !== false) {
      throw new ProductManagementControlledAcceptanceSafetyError("The acceptance runner requires the exact write/read-only-without-approval PM-07 adapter.");
    }
  }

  prepare(compatibilityInput: ProductManagementCompatibilityInput, correlationId: string): ProductManagementControlledAcceptanceDryRun {
    ensurePm07Input(compatibilityInput);
    if (normalizedEmail(compatibilityInput.serverContext.requesterEmail) !== normalizedEmail(this.configuration.approvedRequesterEmail) ||
        normalizedEmail(compatibilityInput.legacyConfiguration.assignTo) !== normalizedEmail(this.configuration.approvedAssignTo) ||
        compatibilityInput.legacyConfiguration.company !== this.configuration.approvedCompany) {
      throw new ProductManagementControlledAcceptanceSafetyError("Requester, routing destination, and company must match the explicitly approved PM-07 values.");
    }
    const dryRun = createProductManagementControlledAcceptanceDryRun({
      compatibilityInput,
      correlationId,
      idempotencyKey: this.configuration.idempotencyKey,
      createdAt: this.now(),
    });
    if (dryRun.envelope.payloadFingerprint !== this.configuration.expectedPayloadFingerprint) {
      throw new ProductManagementControlledAcceptanceSafetyError("The canonical payload fingerprint differs from the reviewed PM-07 fingerprint.");
    }
    return dryRun;
  }

  async execute(compatibilityInput: ProductManagementCompatibilityInput, correlationId: string): Promise<ProductManagementControlledAcceptanceExecutionResult> {
    if (this.executionStarted) throw new ProductManagementControlledAcceptanceSafetyError("This PM-07 runner instance is permanently bounded to one submission attempt.");
    this.executionStarted = true;
    const dryRun = this.prepare(compatibilityInput, correlationId);
    const targetObservation = await this.adapter.inspectTarget(dryRun.envelope);
    if (targetObservation.listTitle !== this.configuration.listTitle || targetObservation.baseTemplate !== 100 || targetObservation.hidden ||
        normalizedEmail(targetObservation.currentUserEmail) !== normalizedEmail(this.configuration.approvedRequesterEmail) ||
        targetObservation.currentUserDisplayName !== dryRun.envelope.payload.ID_Employee || targetObservation.currentUserPrincipalType !== 1 ||
        targetObservation.existingMarkerMatches !== 0) {
      throw new ProductManagementControlledAcceptanceSafetyError("Target, delegated test identity, or one-marker pre-write verification failed.");
    }
    const submitResult = await this.adapter.submit(dryRun.envelope);
    if (submitResult.status === "UNKNOWN_OUTCOME") {
      return Object.freeze({ state: "UNKNOWN_OUTCOME", dryRun, targetObservation, submitResult, verification: null,
        attempts: 1, automaticRetries: 0, portalApprovalCreated: false, approvalBypassed: false,
        provisioningPerformed: false, rejectionPerformed: false });
    }
    if (submitResult.status === "FAILED_BEFORE_CONFIRMED_WRITE") {
      return Object.freeze({ state: "FAILED", dryRun, targetObservation, submitResult, verification: null,
        attempts: 1, automaticRetries: 0, portalApprovalCreated: false, approvalBypassed: false,
        provisioningPerformed: false, rejectionPerformed: false });
    }
    const verification = await this.adapter.verify(dryRun.envelope, submitResult.downstreamReference);
    return Object.freeze({
      state: verification.status === "VERIFIED" ? "VERIFIED_PENDING_LEGACY_APPROVAL" : "ACCEPTED_UNVERIFIED",
      dryRun,
      targetObservation,
      submitResult,
      verification,
      attempts: 1,
      automaticRetries: 0,
      portalApprovalCreated: false,
      approvalBypassed: false,
      provisioningPerformed: false,
      rejectionPerformed: false,
    });
  }
}

type JsonObject = Readonly<Record<string, unknown>>;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

interface SharePointListMetadata {
  readonly Title?: unknown;
  readonly BaseTemplate?: unknown;
  readonly Hidden?: unknown;
}

interface SharePointFieldMetadata {
  readonly Title?: unknown;
  readonly InternalName?: unknown;
  readonly Hidden?: unknown;
  readonly ReadOnlyField?: unknown;
}

function unwrapObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object") throw new ProductManagementControlledAcceptanceSafetyError("SharePoint returned an invalid response shape.");
  const object = value as JsonObject;
  if (object.d && typeof object.d === "object") return object.d as JsonObject;
  return object;
}

function unwrapArray(value: unknown): readonly JsonObject[] {
  const object = unwrapObject(value);
  const candidate = Array.isArray(object.value) ? object.value : Array.isArray(object.results) ? object.results : [];
  if (!candidate.every((item) => item && typeof item === "object")) {
    throw new ProductManagementControlledAcceptanceSafetyError("SharePoint returned an invalid collection shape.");
  }
  return candidate as readonly JsonObject[];
}

function failure(code: ProductManagementAdapterFailure["code"], retryClassification: ProductManagementAdapterFailure["retryClassification"] = "NON_RETRYABLE"): ProductManagementAdapterFailure {
  return Object.freeze({ code, retryClassification });
}

export class SharePointProductManagementControlledAcceptanceAdapter implements ProductManagementControlledAcceptanceAdapter {
  readonly target = PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET;
  readonly capabilities = Object.freeze({ submit: true, verify: true, reconcileByMarker: true, network: true,
    approve: false, reject: false, provision: false, revoke: false } as const);
  private submitStarted = false;

  constructor(
    readonly configuration: ProductManagementControlledAcceptanceConfiguration,
    private readonly getAccessToken: () => Promise<string>,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  private listPath(suffix = ""): string {
    return `${this.configuration.siteUrl}/_api/web/lists(guid'${this.configuration.listId}')${suffix}`;
  }

  private async request(url: string | URL, init: RequestInit = {}): Promise<Response> {
    const token = (await this.getAccessToken()).trim();
    if (!token) throw new ProductManagementControlledAcceptanceSafetyError("The controlled adapter did not receive an access token.");
    return this.fetchImpl(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json;odata=nometadata", Authorization: `Bearer ${token}`, ...init.headers } });
  }

  private assertEnvelope(envelope: ProductManagementControlledAcceptanceEnvelopeV1): void {
    if (envelope.schemaVersion !== PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION ||
        envelope.target !== PRODUCT_MANAGEMENT_CONTROLLED_ACCEPTANCE_TARGET ||
        envelope.topic !== this.configuration.topic ||
        envelope.acceptanceMarker !== this.configuration.marker ||
        envelope.idempotencyKey !== this.configuration.idempotencyKey ||
        envelope.payloadFingerprint !== this.configuration.expectedPayloadFingerprint ||
        fingerprintProductManagementPayload(envelope.payload) !== envelope.payloadFingerprint ||
        envelope.payload["AccountName(Product)"] !== this.configuration.marker ||
        !envelope.payload.Detail.includes(this.configuration.marker) ||
        normalizedEmail(envelope.payload.Title) !== normalizedEmail(this.configuration.approvedRequesterEmail) ||
        normalizedEmail(envelope.payload.AssignTo) !== normalizedEmail(this.configuration.approvedAssignTo) ||
        envelope.payload.Company_ !== this.configuration.approvedCompany) {
      throw new ProductManagementControlledAcceptanceSafetyError("The adapter rejected an unreviewed or drifted PM-07 envelope.");
    }
  }

  private async readJson(url: string | URL): Promise<unknown> {
    const response = await this.request(url);
    if (!response.ok) throw new ProductManagementControlledAcceptanceSafetyError(`Controlled SharePoint read failed with HTTP ${response.status}.`);
    return response.json();
  }

  private async resolveFields(payload: LegacyProductManagementPayload): Promise<Readonly<Record<LegacyProductManagementFieldName, string>>> {
    const url = new URL(this.listPath("/fields"));
    url.searchParams.set("$select", "Title,InternalName,Hidden,ReadOnlyField");
    url.searchParams.set("$top", "500");
    const fields = unwrapArray(await this.readJson(url)) as readonly SharePointFieldMetadata[];
    const result: Partial<Record<LegacyProductManagementFieldName, string>> = {};
    for (const payloadField of Object.keys(payload) as LegacyProductManagementFieldName[]) {
      const matches = fields.filter((field) => (field.Title === payloadField || field.InternalName === payloadField) &&
        field.Hidden === false && field.ReadOnlyField === false && typeof field.InternalName === "string" && /^[A-Za-z0-9_]+$/.test(field.InternalName));
      if (matches.length !== 1) throw new ProductManagementControlledAcceptanceSafetyError(`SharePoint field ${payloadField} is missing, ambiguous, hidden, read-only, or unsafe.`);
      result[payloadField] = matches[0]!.InternalName as string;
    }
    return Object.freeze(result as Record<LegacyProductManagementFieldName, string>);
  }

  private markerQueryUrl(fields: Readonly<Record<LegacyProductManagementFieldName, string>>): URL {
    const accountField = fields["AccountName(Product)"];
    const topicField = fields.Topic_Request;
    if (!accountField || !topicField) throw new ProductManagementControlledAcceptanceSafetyError("Marker reconciliation fields were not resolved.");
    const url = new URL(this.listPath("/items"));
    const escapedMarker = this.configuration.marker.replace(/'/g, "''");
    const escapedTopic = this.configuration.topic.replace(/'/g, "''");
    url.searchParams.set("$select", `Id,${Object.values(fields).join(",")}`);
    url.searchParams.set("$filter", `${accountField} eq '${escapedMarker}' and ${topicField} eq '${escapedTopic}'`);
    url.searchParams.set("$top", "2");
    return url;
  }

  async inspectTarget(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceTargetObservation> {
    this.assertEnvelope(envelope);
    const metadataUrl = new URL(this.listPath());
    metadataUrl.searchParams.set("$select", "Title,BaseTemplate,Hidden");
    const identityUrl = new URL(`${this.configuration.siteUrl}/_api/web/currentuser`);
    identityUrl.searchParams.set("$select", "Email,Title,PrincipalType");
    const [metadataValue, identityValue, fields] = await Promise.all([
      this.readJson(metadataUrl),
      this.readJson(identityUrl),
      this.resolveFields(envelope.payload),
    ]);
    const metadata = unwrapObject(metadataValue) as SharePointListMetadata;
    const identity = unwrapObject(identityValue);
    const markerMatches = unwrapArray(await this.readJson(this.markerQueryUrl(fields))).length;
    return Object.freeze({
      listTitle: typeof metadata.Title === "string" ? metadata.Title : "",
      baseTemplate: typeof metadata.BaseTemplate === "number" ? metadata.BaseTemplate : -1,
      hidden: metadata.Hidden === true,
      currentUserEmail: typeof identity.Email === "string" ? identity.Email : "",
      currentUserDisplayName: typeof identity.Title === "string" ? identity.Title : "",
      currentUserPrincipalType: typeof identity.PrincipalType === "number" ? identity.PrincipalType : -1,
      existingMarkerMatches: markerMatches,
      fieldInternalNames: fields,
    });
  }

  async submit(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceSubmitResult> {
    if (this.submitStarted) throw new ProductManagementControlledAcceptanceSafetyError("The real PM-07 adapter permits only one POST attempt per instance.");
    this.submitStarted = true;
    const observation = await this.inspectTarget(envelope);
    if (observation.listTitle !== this.configuration.listTitle || observation.baseTemplate !== 100 || observation.hidden || observation.existingMarkerMatches !== 0 ||
        normalizedEmail(observation.currentUserEmail) !== normalizedEmail(this.configuration.approvedRequesterEmail) ||
        observation.currentUserDisplayName !== envelope.payload.ID_Employee || observation.currentUserPrincipalType !== 1) {
      throw new ProductManagementControlledAcceptanceSafetyError("The real adapter pre-write target, identity, or marker gate failed.");
    }
    const body = Object.fromEntries(Object.entries(envelope.payload).map(([field, value]) => [observation.fieldInternalNames[field as LegacyProductManagementFieldName], value]));
    let response: Response;
    try {
      response = await this.request(this.listPath("/items"), {
        method: "POST",
        headers: { "Content-Type": "application/json;odata=nometadata" },
        body: JSON.stringify(body),
      });
    } catch {
      return { status: "UNKNOWN_OUTCOME", failure: failure("UNKNOWN_OUTCOME", "UNKNOWN") };
    }
    if (!response.ok) {
      if (response.status === 401) return { status: "FAILED_BEFORE_CONFIRMED_WRITE", failure: failure("AUTHENTICATION_FAILURE") };
      if (response.status === 403) return { status: "FAILED_BEFORE_CONFIRMED_WRITE", failure: failure("AUTHORIZATION_FAILURE") };
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return { status: "FAILED_BEFORE_CONFIRMED_WRITE", failure: failure(response.status === 400 ? "PAYLOAD_CONTRACT_MISMATCH" : "DOWNSTREAM_4XX") };
      }
      return { status: "UNKNOWN_OUTCOME", failure: failure("UNKNOWN_OUTCOME", "UNKNOWN") };
    }
    try {
      const created = unwrapObject(await response.json());
      const id = typeof created.Id === "number" || typeof created.Id === "string" ? String(created.Id) : "";
      if (!/^[1-9][0-9]*$/.test(id)) return { status: "UNKNOWN_OUTCOME", failure: failure("UNKNOWN_OUTCOME", "UNKNOWN") };
      return { status: "ACCEPTED_BY_ADAPTER", downstreamReference: id };
    } catch {
      return { status: "UNKNOWN_OUTCOME", failure: failure("UNKNOWN_OUTCOME", "UNKNOWN") };
    }
  }

  private payloadMatches(item: JsonObject, envelope: ProductManagementControlledAcceptanceEnvelopeV1, fields: Readonly<Record<LegacyProductManagementFieldName, string>>): boolean {
    return Object.entries(envelope.payload).every(([field, expected]) => item[fields[field as LegacyProductManagementFieldName]] === expected);
  }

  async verify(envelope: ProductManagementControlledAcceptanceEnvelopeV1, downstreamReference: string): Promise<ProductManagementControlledAcceptanceVerificationResult> {
    this.assertEnvelope(envelope);
    if (!/^[1-9][0-9]*$/.test(downstreamReference)) return { status: "FAILED", failure: failure("VERIFICATION_FAILED") };
    try {
      const fields = await this.resolveFields(envelope.payload);
      const url = new URL(this.listPath(`/items(${downstreamReference})`));
      url.searchParams.set("$select", `Id,${Object.values(fields).join(",")}`);
      const item = unwrapObject(await this.readJson(url));
      return this.payloadMatches(item, envelope, fields)
        ? { status: "VERIFIED", downstreamReference }
        : { status: "FAILED", failure: failure("VERIFICATION_FAILED") };
    } catch {
      return { status: "UNAVAILABLE", failure: failure("VERIFICATION_UNAVAILABLE") };
    }
  }

  async reconcileByMarker(envelope: ProductManagementControlledAcceptanceEnvelopeV1): Promise<ProductManagementControlledAcceptanceVerificationResult> {
    this.assertEnvelope(envelope);
    try {
      const fields = await this.resolveFields(envelope.payload);
      const matches = unwrapArray(await this.readJson(this.markerQueryUrl(fields)));
      if (matches.length !== 1) return { status: "FAILED", failure: failure("VERIFICATION_FAILED") };
      const item = matches[0]!;
      const id = typeof item.Id === "number" || typeof item.Id === "string" ? String(item.Id) : "";
      return /^[1-9][0-9]*$/.test(id) && this.payloadMatches(item, envelope, fields)
        ? { status: "VERIFIED", downstreamReference: id }
        : { status: "FAILED", failure: failure("VERIFICATION_FAILED") };
    } catch {
      return { status: "UNAVAILABLE", failure: failure("VERIFICATION_UNAVAILABLE") };
    }
  }
}
