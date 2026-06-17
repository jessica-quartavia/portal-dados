type Row = {
  tipo: string;
  quantidade: number;
};

export default function BarList({
  title,
  rows,
  loading,
  emptyText,
}: {
  title: string;
  rows: Row[];
  loading?: boolean;
  emptyText: string;
}) {
  const max = Math.max(...rows.map((row) => row.quantidade), 1);

  return (
    <section className="comercial-panel">
      <div className="comercial-panel__header">
        <h2>{title}</h2>
      </div>
      {loading ? (
        <div className="comercial-empty">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="comercial-empty">{emptyText}</div>
      ) : (
        <div className="comercial-bar-list">
          {rows.map((row) => (
            <div className="comercial-bar-row" key={row.tipo}>
              <div className="comercial-bar-row__label">
                <span>{row.tipo}</span>
                <strong>{row.quantidade}</strong>
              </div>
              <div className="comercial-bar-row__track">
                <div
                  className="comercial-bar-row__fill"
                  style={{ width: `${(row.quantidade / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
