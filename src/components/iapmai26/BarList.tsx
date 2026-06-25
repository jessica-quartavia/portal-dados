type Row = {
  tipo: string;
  quantidade: number;
};

export default function BarList({
  title,
  rows,
  loading,
  emptyText
}: {
  title: string;
  rows: Row[];
  loading?: boolean;
  emptyText: string;
}) {
  const max = Math.max(...rows.map((row) => row.quantidade), 1);

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{title}</h2>
      </div>
      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="empty-state">{emptyText}</div>
      ) : (
        <div className="bar-list">
          {rows.map((row) => (
            <div className="bar-row" key={row.tipo}>
              <div className="bar-label">
                <span>{row.tipo}</span>
                <strong>{row.quantidade}</strong>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(row.quantidade / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
