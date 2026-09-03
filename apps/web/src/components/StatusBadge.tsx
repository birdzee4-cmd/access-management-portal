import type { PropsWithChildren } from "react";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface StatusBadgeProps extends PropsWithChildren {
  readonly tone?: StatusTone;
}

export function StatusBadge({
  children,
  tone = "neutral",
}: StatusBadgeProps) {
  return <span className={"status-badge status-badge--" + tone}>{children}</span>;
}
