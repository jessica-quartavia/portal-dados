type Props = {
  title: string;
  value?: number | string;
  loading?: boolean;
  tone?: "default" | "success" | "warning" | "info";
};

export default function MetricCard({ title, value, loading, tone = "default" }: Props) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <span>{title}</span>
      <strong>{loading ? "..." : value ?? 0}</strong>
    </article>
  );
}
