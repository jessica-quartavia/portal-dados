type Row = {
  dia: string;
  faixa: string;
  quantidade: number;
};

const incomeOrder = ["Acima de 20k", "De 15k à 20k", "Nao informado"];

function formatDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(`${value}T00:00:00`));
}

export default function DailyIncomeChart({
  rows,
  loading
}: {
  rows: Row[];
  loading?: boolean;
}) {
  const days = Array.from(new Set(rows.map((row) => row.dia)));
  const max = Math.max(...rows.map((row) => row.quantidade), 1);

  return (
    <section className="panel income-day-panel">
      <div className="panel-header">
        <h2>Renda por dia</h2>
      </div>
      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : days.length === 0 ? (
        <div className="empty-state">Sem reunioes agendadas no periodo.</div>
      ) : (
        <div className="daily-income-list">
          {days.map((day) => {
            const dayRows = incomeOrder.map((faixa) => ({
              faixa,
              quantidade: rows.find((row) => row.dia === day && row.faixa === faixa)?.quantidade ?? 0
            }));
            const total = dayRows.reduce((sum, row) => sum + row.quantidade, 0);

            return (
              <div className="daily-income-group" key={day}>
                <div className="daily-income-heading">
                  <span>{formatDay(day)}</span>
                  <strong>{total}</strong>
                </div>
                <div className="bar-list">
                  {dayRows.map((row) => (
                    <div className="bar-row" key={`${day}-${row.faixa}`}>
                      <div className="bar-label">
                        <span>{row.faixa}</span>
                        <strong>{row.quantidade}</strong>
                      </div>
                      <div className="bar-track" title={`${formatDay(day)} - ${row.faixa}: ${row.quantidade}`}>
                        <div className="bar-fill" style={{ width: `${(row.quantidade / max) * 100}%` }} />
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
