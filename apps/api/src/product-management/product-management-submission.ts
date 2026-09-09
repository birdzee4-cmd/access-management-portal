import { createHash } from "node:crypto";
import {
  ProductManagementCompatibilityError,
  ProductManagementRuntimeSafetyError,
  serializeProductManagementCompatibilityPayload,
  validateProductManagementCompatibilityPayload,
  type LegacyProductManagementPayload,
  type ProductManagementCompatibilityInput,
} from "./product-management-compatibility.js";
import type { ProductManagementTopic } from "./product-management-model.js";

export const PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION = "product-management-submission-envelope/v1" as const;
export const PRODUCT_MANAGEMENT_RETRY_POLICY = {
  maximumAttempts: 3,
  backoffMilliseconds: [0, 250, 1000] as const,
  waitingMode: "CALLER_SCHEDULED_NO_INTERNAL_SLEEP",
} as const;

export type ProductManagementSubmissionState =
  | "VALIDATED"
  | "SERIALIZED"
  | "READY_FOR_ADAPTER"
  | "ATTEMPTED"
  | "ACCEPTED_BY_ADAPTER"
  | "FAILED"
  | "VERIFIED";

export type ProductManagementAdapterTarget = Readonly<{
  classification: "SYNTHETIC_NON_PRODUCTION";
  name: "PM06_ACCEPTANCE";
}>;

export interface ProductManagementSubmissionEnvelopeV1 {
  readonly schemaVersion: typeof PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION;
  readonly topic: ProductManagementTopic;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly payloadFingerprint: `sha256:${string}`;
  readonly payload: LegacyProductManagementPayload;
  readonly createdAt: string;
  readonly target: ProductManagementAdapterTarget;
}

export type ProductManagementFailureCode =
  | "VALIDATION_ERROR"
  | "SERIALIZATION_ERROR"
  | "ADAPTER_UNAVAILABLE"
  | "TIMEOUT"
  | "TEMPORARY_NETWORK_FAILURE"
  | "DOWNSTREAM_429"
  | "DOWNSTREAM_4XX"
  | "DOWNSTREAM_5XX"
  | "AUTHENTICATION_FAILURE"
  | "AUTHORIZATION_FAILURE"
  | "UNSUPPORTED_TOPIC"
  | "PAYLOAD_CONTRACT_MISMATCH"
  | "IDEMPOTENCY_CONFLICT"
  | "BUSINESS_REJECTION"
  | "UNKNOWN_OUTCOME"
  | "RETRY_EXHAUSTED"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_UNAVAILABLE";

export type ProductManagementRetryClassification = "RETRYABLE" | "NON_RETRYABLE" | "UNKNOWN";

export interface ProductManagementAdapterFailure {
  readonly code: ProductManagementFailureCode;
  readonly retryClassification: ProductManagementRetryClassification;
}

export type ProductManagementAdapterResult =
  | Readonly<{ status: "ACCEPTED_BY_ADAPTER"; downstreamReference: string }>
  | Readonly<{ status: "FAILED"; failure: ProductManagementAdapterFailure }>
  | Readonly<{ status: "UNKNOWN"; failure: ProductManagementAdapterFailure }>;

export type ProductManagementVerificationResult =
  | Readonly<{ status: "VERIFIED"; downstreamReference: string }>
  | Readonly<{ status: "FAILED"; failure: ProductManagementAdapterFailure }>
  | Readonly<{ status: "UNAVAILABLE"; failure: ProductManagementAdapterFailure }>;

export interface ProductManagementSubmissionAdapter {
  readonly target: ProductManagementAdapterTarget;
  readonly capabilities: Readonly<{ submit: true; verify: true; network: false }>;
  submit(envelope: ProductManagementSubmissionEnvelopeV1, attempt: number): Promise<ProductManagementAdapterResult>;
  verify(envelope: ProductManagementSubmissionEnvelopeV1, downstreamReference: string): Promise<ProductManagementVerificationResult>;
}

export interface ProductManagementSubmissionAuditEvent {
  readonly eventType:
    | "PRODUCT_MANAGEMENT_SUBMISSION_PREPARED"
    | "PRODUCT_MANAGEMENT_SUBMISSION_ATTEMPTED"
    | "PRODUCT_MANAGEMENT_SUBMISSION_ACCEPTED"
    | "PRODUCT_MANAGEMENT_SUBMISSION_FAILED"
    | "PRODUCT_MANAGEMENT_SUBMISSION_VERIFIED";
  readonly correlationId: string;
  readonly topic: ProductManagementTopic;
  readonly adapterClassification: ProductManagementAdapterTarget["classification"];
  readonly payloadFingerprint: `sha256:${string}`;
  readonly attempt: number;
  readonly resultClassification: string;
  readonly occurredAt: string;
}

export interface ProductManagementSubmissionAuditSink {
  append(event: ProductManagementSubmissionAuditEvent): void;
}

export class InMemoryProductManagementSubmissionAuditSink implements ProductManagementSubmissionAuditSink {
  readonly events: ProductManagementSubmissionAuditEvent[] = [];
  append(event: ProductManagementSubmissionAuditEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}

export interface ProductManagementSubmissionMetrics {
  prepared: number;
  attempted: number;
  accepted: number;
  failed: number;
  retried: number;
  idempotencyConflicts: number;
  verificationFailures: number;
  unknownOutcomes: number;
}

export interface ProductManagementSubmissionExecutionResult {
  readonly state: "VERIFIED" | "FAILED" | "ACCEPTED_BY_ADAPTER";
  readonly transitions: readonly ProductManagementSubmissionState[];
  readonly envelope: ProductManagementSubmissionEnvelopeV1;
  readonly attempts: number;
  readonly replayed: boolean;
  readonly downstreamReference: string | null;
  readonly verification: ProductManagementVerificationResult | null;
  readonly failure: ProductManagementAdapterFailure | null;
  readonly portalApprovalCreated: false;
  readonly provisioningPerformed: false;
}

interface IdempotencyRecord {
  readonly payloadFingerprint: string;
  readonly result: Promise<ProductManagementSubmissionExecutionResult>;
}

export interface ProductManagementIdempotencyStore {
  execute(
    idempotencyKey: string,
    payloadFingerprint: string,
    action: () => Promise<ProductManagementSubmissionExecutionResult>,
  ): Promise<ProductManagementSubmissionExecutionResult>;
}

export class ProductManagementIdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT" as const;
  constructor() {
    super("Product Management idempotency key is already bound to a different canonical payload.");
    this.name = "ProductManagementIdempotencyConflictError";
  }
}

export class InMemoryProductManagementIdempotencyStore implements ProductManagementIdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async execute(
    idempotencyKey: string,
    payloadFingerprint: string,
    action: () => Promise<ProductManagementSubmissionExecutionResult>,
  ): Promise<ProductManagementSubmissionExecutionResult> {
    const existing = this.records.get(idempotencyKey);
    if (existing) {
      if (existing.payloadFingerprint !== payloadFingerprint) throw new ProductManagementIdempotencyConflictError();
      return { ...(await existing.result), replayed: true };
    }
    const result = action();
    this.records.set(idempotencyKey, { payloadFingerprint, result });
    return result;
  }
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new ProductManagementRuntimeSafetyError("Envelope canonicalization rejects non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right, "en-US"));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  throw new ProductManagementRuntimeSafetyError("Envelope canonicalization rejects unsupported values.");
}

export function canonicalizeProductManagementPayload(payload: LegacyProductManagementPayload): string {
  return canonicalize(payload);
}

export function fingerprintProductManagementPayload(payload: LegacyProductManagementPayload): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalizeProductManagementPayload(payload), "utf8").digest("hex")}`;
}

function requiredMetadata(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 200 || /[\u0000-\u001f]/.test(normalized)) {
    throw new ProductManagementRuntimeSafetyError(`Invalid Product Management ${name}.`);
  }
  return normalized;
}

function validateSyntheticTarget(target: unknown): asserts target is ProductManagementAdapterTarget {
  if (!target || typeof target !== "object" ||
      (target as { classification?: unknown }).classification !== "SYNTHETIC_NON_PRODUCTION" ||
      (target as { name?: unknown }).name !== "PM06_ACCEPTANCE") {
    throw new ProductManagementRuntimeSafetyError("Only the explicit PM-06 synthetic non-Production target is permitted.");
  }
}

export function createProductManagementSubmissionEnvelope(input: Readonly<{
  compatibilityInput: ProductManagementCompatibilityInput;
  correlationId: string;
  idempotencyKey: string;
  createdAt: string;
  target: ProductManagementAdapterTarget;
}>): ProductManagementSubmissionEnvelopeV1 {
  validateSyntheticTarget(input.target);
  const createdAt = new Date(input.createdAt);
  if (Number.isNaN(createdAt.valueOf()) || createdAt.toISOString() !== input.createdAt) {
    throw new ProductManagementRuntimeSafetyError("Envelope createdAt must be an exact UTC ISO timestamp.");
  }
  const payload = serializeProductManagementCompatibilityPayload(input.compatibilityInput);
  const validationErrors = validateProductManagementCompatibilityPayload(input.compatibilityInput, payload);
  if (validationErrors.length) throw new ProductManagementCompatibilityError(validationErrors);
  return Object.freeze({
    schemaVersion: PRODUCT_MANAGEMENT_SUBMISSION_SCHEMA_VERSION,
    topic: input.compatibilityInput.topic,
    correlationId: requiredMetadata(input.correlationId, "correlationId"),
    idempotencyKey: requiredMetadata(input.idempotencyKey, "idempotencyKey"),
    payloadFingerprint: fingerprintProductManagementPayload(payload),
    payload: Object.freeze({ ...payload }),
    createdAt: input.createdAt,
    target: Object.freeze({ ...input.target }),
  });
}

export function classifyProductManagementFailure(code: ProductManagementFailureCode): ProductManagementRetryClassification {
  if (["TIMEOUT", "TEMPORARY_NETWORK_FAILURE", "DOWNSTREAM_429", "DOWNSTREAM_5XX", "ADAPTER_UNAVAILABLE"].includes(code)) return "RETRYABLE";
  if (code === "UNKNOWN_OUTCOME") return "UNKNOWN";
  return "NON_RETRYABLE";
}

export type SyntheticProductManagementAdapterBehavior =
  | "ACCEPT"
  | "ADAPTER_UNAVAILABLE"
  | "TIMEOUT"
  | "TEMPORARY_NETWORK_FAILURE"
  | "DOWNSTREAM_429"
  | "DOWNSTREAM_4XX"
  | "DOWNSTREAM_5XX"
  | "AUTHENTICATION_FAILURE"
  | "AUTHORIZATION_FAILURE"
  | "PAYLOAD_CONTRACT_MISMATCH"
  | "BUSINESS_REJECTION"
  | "UNKNOWN_AFTER_ACCEPTANCE";

export class SyntheticProductManagementSubmissionAdapter implements ProductManagementSubmissionAdapter {
  readonly target = { classification: "SYNTHETIC_NON_PRODUCTION", name: "PM06_ACCEPTANCE" } as const;
  readonly capabilities = { submit: true, verify: true, network: false } as const;
  private readonly mutableAttempts: { idempotencyKey: string; attempt: number }[] = [];
  private readonly mutableAccepted: { idempotencyKey: string; downstreamReference: string }[] = [];
  private readonly accepted = new Map<string, { fingerprint: string; reference: string }>();
  private behaviorIndex = 0;

  constructor(
    private readonly behaviors: readonly SyntheticProductManagementAdapterBehavior[] = ["ACCEPT"],
    private readonly verificationBehavior: "VERIFIED" | "FAILED" | "UNAVAILABLE" = "VERIFIED",
  ) {}

  get attempts(): ReadonlyArray<{ readonly idempotencyKey: string; readonly attempt: number }> {
    return this.mutableAttempts;
  }

  get acceptedActions(): ReadonlyArray<{ readonly idempotencyKey: string; readonly downstreamReference: string }> {
    return this.mutableAccepted;
  }

  async submit(envelope: ProductManagementSubmissionEnvelopeV1, attempt: number): Promise<ProductManagementAdapterResult> {
    validateSyntheticTarget(envelope.target);
    this.mutableAttempts.push({ idempotencyKey: envelope.idempotencyKey, attempt });
    const prior = this.accepted.get(envelope.idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== envelope.payloadFingerprint) {
        return { status: "FAILED", failure: { code: "IDEMPOTENCY_CONFLICT", retryClassification: "NON_RETRYABLE" } };
      }
      return { status: "ACCEPTED_BY_ADAPTER", downstreamReference: prior.reference };
    }
    const behavior = this.behaviors[Math.min(this.behaviorIndex++, this.behaviors.length - 1)] ?? "ACCEPT";
    if (behavior === "UNKNOWN_AFTER_ACCEPTANCE") {
      const reference = `SYNTHETIC-UNKNOWN-${this.mutableAccepted.length + 1}`;
      this.accepted.set(envelope.idempotencyKey, { fingerprint: envelope.payloadFingerprint, reference });
      this.mutableAccepted.push({ idempotencyKey: envelope.idempotencyKey, downstreamReference: reference });
      return { status: "UNKNOWN", failure: { code: "UNKNOWN_OUTCOME", retryClassification: "UNKNOWN" } };
    }
    if (behavior !== "ACCEPT") {
      const code = behavior as ProductManagementFailureCode;
      return { status: "FAILED", failure: { code, retryClassification: classifyProductManagementFailure(code) } };
    }
    const reference = `SYNTHETIC-PM06-${this.mutableAccepted.length + 1}`;
    this.accepted.set(envelope.idempotencyKey, { fingerprint: envelope.payloadFingerprint, reference });
    this.mutableAccepted.push({ idempotencyKey: envelope.idempotencyKey, downstreamReference: reference });
    return { status: "ACCEPTED_BY_ADAPTER", downstreamReference: reference };
  }

  async verify(_envelope: ProductManagementSubmissionEnvelopeV1, downstreamReference: string): Promise<ProductManagementVerificationResult> {
    if (this.verificationBehavior === "VERIFIED") return { status: "VERIFIED", downstreamReference };
    if (this.verificationBehavior === "UNAVAILABLE") return { status: "UNAVAILABLE", failure: { code: "VERIFICATION_UNAVAILABLE", retryClassification: "NON_RETRYABLE" } };
    return { status: "FAILED", failure: { code: "VERIFICATION_FAILED", retryClassification: "NON_RETRYABLE" } };
  }
}

export class DisabledProductManagementSubmissionAdapter {
  readonly mode = "DISABLED" as const;
  async submit(_envelope: ProductManagementSubmissionEnvelopeV1): Promise<never> {
    throw new ProductManagementRuntimeSafetyError("Product Management submission adapter is disabled.");
  }
}

export function createProductManagementSubmissionAdapter(
  target: unknown,
  behaviors?: readonly SyntheticProductManagementAdapterBehavior[],
): ProductManagementSubmissionAdapter {
  validateSyntheticTarget(target);
  return new SyntheticProductManagementSubmissionAdapter(behaviors);
}

export class ProductManagementSubmissionService {
  readonly metrics: ProductManagementSubmissionMetrics = {
    prepared: 0, attempted: 0, accepted: 0, failed: 0, retried: 0,
    idempotencyConflicts: 0, verificationFailures: 0, unknownOutcomes: 0,
  };

  constructor(
    private readonly adapter: ProductManagementSubmissionAdapter,
    private readonly idempotency: ProductManagementIdempotencyStore,
    private readonly audit: ProductManagementSubmissionAuditSink,
    private readonly now: () => string,
  ) {
    validateSyntheticTarget(adapter.target);
    if (adapter.capabilities.network !== false) throw new ProductManagementRuntimeSafetyError("PM-06 adapters must declare network=false.");
  }

  async execute(input: Readonly<{
    compatibilityInput: ProductManagementCompatibilityInput;
    correlationId: string;
    idempotencyKey: string;
  }>): Promise<ProductManagementSubmissionExecutionResult> {
    const envelope = createProductManagementSubmissionEnvelope({ ...input, createdAt: this.now(), target: this.adapter.target });
    try {
      return await this.idempotency.execute(envelope.idempotencyKey, envelope.payloadFingerprint, async () => this.executeOnce(envelope));
    } catch (error) {
      if (error instanceof ProductManagementIdempotencyConflictError) {
        this.metrics.idempotencyConflicts += 1;
        this.metrics.failed += 1;
        this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED", 0, "IDEMPOTENCY_CONFLICT");
      }
      throw error;
    }
  }

  private record(envelope: ProductManagementSubmissionEnvelopeV1, eventType: ProductManagementSubmissionAuditEvent["eventType"], attempt: number, resultClassification: string): void {
    this.audit.append({ eventType, correlationId: envelope.correlationId, topic: envelope.topic,
      adapterClassification: envelope.target.classification, payloadFingerprint: envelope.payloadFingerprint,
      attempt, resultClassification, occurredAt: this.now() });
  }

  private async executeOnce(envelope: ProductManagementSubmissionEnvelopeV1): Promise<ProductManagementSubmissionExecutionResult> {
    const transitions: ProductManagementSubmissionState[] = ["VALIDATED", "SERIALIZED", "READY_FOR_ADAPTER"];
    this.metrics.prepared += 1;
    this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_PREPARED", 0, "READY_FOR_ADAPTER");
    for (let attempt = 1; attempt <= PRODUCT_MANAGEMENT_RETRY_POLICY.maximumAttempts; attempt += 1) {
      transitions.push("ATTEMPTED");
      this.metrics.attempted += 1;
      this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_ATTEMPTED", attempt, "ATTEMPTED");
      let result: ProductManagementAdapterResult;
      try {
        result = await this.adapter.submit(envelope, attempt);
      } catch {
        result = { status: "UNKNOWN", failure: { code: "UNKNOWN_OUTCOME", retryClassification: "UNKNOWN" } };
      }
      if (result.status === "ACCEPTED_BY_ADAPTER") {
        transitions.push("ACCEPTED_BY_ADAPTER");
        this.metrics.accepted += 1;
        this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_ACCEPTED", attempt, "ACCEPTED_BY_ADAPTER");
        let verification: ProductManagementVerificationResult;
        try {
          verification = await this.adapter.verify(envelope, result.downstreamReference);
        } catch {
          verification = { status: "UNAVAILABLE", failure: { code: "VERIFICATION_UNAVAILABLE", retryClassification: "NON_RETRYABLE" } };
        }
        if (verification.status === "VERIFIED") {
          transitions.push("VERIFIED");
          this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_VERIFIED", attempt, "VERIFIED");
          return { state: "VERIFIED", transitions, envelope, attempts: attempt, replayed: false,
            downstreamReference: result.downstreamReference, verification, failure: null,
            portalApprovalCreated: false, provisioningPerformed: false };
        }
        transitions.push("FAILED");
        this.metrics.failed += 1;
        this.metrics.verificationFailures += 1;
        this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED", attempt, verification.failure.code);
        return { state: "ACCEPTED_BY_ADAPTER", transitions, envelope, attempts: attempt, replayed: false,
          downstreamReference: result.downstreamReference, verification, failure: verification.failure,
          portalApprovalCreated: false, provisioningPerformed: false };
      }
      if (result.status === "UNKNOWN") {
        transitions.push("FAILED");
        this.metrics.failed += 1;
        this.metrics.unknownOutcomes += 1;
        this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED", attempt, "UNKNOWN_OUTCOME_NO_AUTOMATIC_RETRY");
        return { state: "FAILED", transitions, envelope, attempts: attempt, replayed: false,
          downstreamReference: null, verification: null, failure: result.failure,
          portalApprovalCreated: false, provisioningPerformed: false };
      }
      const retryable = result.failure.retryClassification === "RETRYABLE";
      if (retryable && attempt < PRODUCT_MANAGEMENT_RETRY_POLICY.maximumAttempts) {
        this.metrics.retried += 1;
        this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED", attempt, `${result.failure.code}_RETRY_SCHEDULED`);
        continue;
      }
      transitions.push("FAILED");
      this.metrics.failed += 1;
      const failure = retryable
        ? { code: "RETRY_EXHAUSTED" as const, retryClassification: "NON_RETRYABLE" as const }
        : result.failure;
      this.record(envelope, "PRODUCT_MANAGEMENT_SUBMISSION_FAILED", attempt, failure.code);
      return { state: "FAILED", transitions, envelope, attempts: attempt, replayed: false,
        downstreamReference: null, verification: null, failure,
        portalApprovalCreated: false, provisioningPerformed: false };
    }
    throw new ProductManagementRuntimeSafetyError("Bounded retry loop ended unexpectedly.");
  }
}
