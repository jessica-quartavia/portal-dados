type Row = {
  dia: string;
  faixa: string;
  quantidade: number;
};

const incomeOrder = ['Acima de 20k', 'De 15k à 20k', 'Nao informado'];

function formatDay(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export default function DailyIncomeChart({
  rows,
  loading,
}: {
  rows: Row[];
  loading?: boolean;
}) {
  const days = Array.from(new Set(rows.map((row) => row.dia)));
  const max = Math.max(...rows.map((row) => row.quantidade), 1);

  return (
    <section className="comercial-panel comercial-panel--income">
      <div className="comercial-panel__header">
        <h2>Renda por dia</h2>
      </div>
      {loading ? (
        <div className="comercial-empty">Carregando…</div>
      ) : days.length === 0 ? (
        <div className="comercial-empty">Sem reuniões agendadas no período.</div>
      ) : (
        <div className="comercial-daily-income">
          {days.map((day) => {
            const dayRows = incomeOrder.map((faixa) => ({
              faixa,
              quantidade:
                rows.find((row) => row.dia === day && row.faixa === faixa)?.quantidade ?? 0,
            }));
            const total = dayRows.reduce((sum, row) => sum + row.quantidade, 0);

            return (
              <div className="comercial-daily-income__group" key={day}>
                <div className="comercial-daily-income__heading">
                  <span>{formatDay(day)}</span>
                  <strong>{total}</strong>
                </div>
                <div className="comercial-bar-list">
                  {dayRows.map((row) => (
                    <div className="comercial-bar-row" key={`${day}-${row.faixa}`}>
                      <div className="comercial-bar-row__label">
                        <span>{row.faixa}</span>
                        <strong>{row.quantidade}</strong>
                      </div>
                      <div
                        className="comercial-bar-row__track"
                        title={`${formatDay(day)} — ${row.faixa}: ${row.quantidade}`}
                      >
                        <div
                          className="comercial-bar-row__fill"
                          style={{ width: `${(row.quantidade / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
