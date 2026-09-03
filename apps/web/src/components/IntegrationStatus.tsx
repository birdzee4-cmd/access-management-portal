import { StatusBadge, type StatusTone } from "./StatusBadge.js";

export interface IntegrationStatusProps {
  readonly name: string;
  readonly description: string;
  readonly status: string;
  readonly tone: StatusTone;
}

export function IntegrationStatus({
  name,
  description,
  status,
  tone,
}: IntegrationStatusProps) {
  return (
    <li className="integration-status">
      <span className="integration-status__marker" aria-hidden="true" />
      <span className="integration-status__content">
        <strong>{name}</strong>
        <small>{description}</small>
      </span>
      <StatusBadge tone={tone}>{status}</StatusBadge>
    </li>
  );
}
