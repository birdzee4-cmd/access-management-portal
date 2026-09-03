export interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone?: "blue" | "green" | "amber" | "slate";
}

export function StatCard({
  label,
  value,
  detail,
  tone = "blue",
}: StatCardProps) {
  return (
    <article className={"stat-card stat-card--" + tone}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </article>
  );
}
