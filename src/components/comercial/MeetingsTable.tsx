import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ComercialMeetingRow } from '../../types/comercial';
import {
  displayCloser,
  displaySdr,
  displayStatus,
  EMPTY_MEETINGS_FILTERS,
  filterMeetings,
  formatMeetingDate,
  getStatusBadgeClass,
  getStatusBadgeTone,
  hasActiveMeetingsFilters,
  MEETINGS_PAGE_SIZE,
  type MeetingsTableFilters,
} from './meetingsTableHelpers';

type MeetingsTableProps = {
  meetings: ComercialMeetingRow[];
  loading?: boolean;
};

function FilterLabel({ children }: { children: ReactNode }) {
  return (
    <span className="comercial-meetings-filter__label">{children}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = displayStatus(status);
  const tone = getStatusBadgeTone(status);
  return <span className={getStatusBadgeClass(tone)}>{label}</span>;
}

export default function MeetingsTable({ meetings, loading = false }: MeetingsTableProps) {
  const [filters, setFilters] = useState<MeetingsTableFilters>(EMPTY_MEETINGS_FILTERS);
  const [visibleCount, setVisibleCount] = useState(MEETINGS_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(MEETINGS_PAGE_SIZE);
  }, [filters]);

  const filteredMeetings = useMemo(
    () => filterMeetings(meetings, filters),
    [meetings, filters],
  );

  const visibleMeetings = filteredMeetings.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMeetings.length;
  const hasFilters = hasActiveMeetingsFilters(filters);
  const showBitrixColumn = meetings.some((meeting) => meeting.bitrixDealId?.trim());

  const updateFilter = (key: keyof MeetingsTableFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="comercial-empty">Carregando…</div>;
  }

  if (meetings.length === 0) {
    return <div className="comercial-empty">Sem reuniões no período.</div>;
  }

  return (
    <section className="comercial-meetings-table" aria-label="Tabela de reuniões">
      <header className="comercial-meetings-table__header">
        <h2>Tabela de reuniões</h2>
        <p>Filtros abaixo afetam apenas a tabela de reuniões</p>
      </header>

      <div className="comercial-meetings-filters">
        <p className="comercial-meetings-filters__hint">
          Filtros locais da tabela
        </p>
        <div className="comercial-meetings-filters__grid">
          <label className="comercial-meetings-filter">
            <FilterLabel>Cliente</FilterLabel>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={filters.cliente}
              onChange={(e) => updateFilter('cliente', e.target.value)}
            />
          </label>
          <label className="comercial-meetings-filter">
            <FilterLabel>Closer</FilterLabel>
            <input
              type="text"
              placeholder="Nome do closer"
              value={filters.closer}
              onChange={(e) => updateFilter('closer', e.target.value)}
            />
          </label>
          <label className="comercial-meetings-filter">
            <FilterLabel>SDR</FilterLabel>
            <input
              type="text"
              placeholder="Nome do SDR"
              value={filters.sdr}
              onChange={(e) => updateFilter('sdr', e.target.value)}
            />
          </label>
          <label className="comercial-meetings-filter">
            <FilterLabel>Status</FilterLabel>
            <input
              type="text"
              placeholder="Status do agendamento"
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
            />
          </label>
          <label className="comercial-meetings-filter">
            <FilterLabel>Data</FilterLabel>
            <input
              type="date"
              value={filters.data}
              onChange={(e) => updateFilter('data', e.target.value)}
            />
          </label>
          {hasFilters && (
            <button
              type="button"
              className="qv-btn qv-btn--ghost comercial-meetings-filters__clear"
              onClick={() => setFilters(EMPTY_MEETINGS_FILTERS)}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <p className="comercial-meetings-table__empty">
          Nenhuma linha corresponde aos filtros da tabela.
        </p>
      ) : (
        <>
          <p className="comercial-meetings-table__count">
            Exibindo {visibleMeetings.length} de {filteredMeetings.length} registro
            {filteredMeetings.length !== 1 ? 's' : ''}
            {hasFilters ? ` (filtrado de ${meetings.length})` : ''}
          </p>

          <div className="comercial-table-wrap">
            <table className="qv-table comercial-meetings-table__grid">
              <thead>
                <tr>
                  <th>Nome do cliente</th>
                  <th>Nome do closer</th>
                  <th>Nome do SDR</th>
                  <th>Data do agendamento</th>
                  <th>Status do agendamento</th>
                  {showBitrixColumn && <th style={{ textAlign: 'right' }}>ID Bitrix</th>}
                </tr>
              </thead>
              <tbody>
                {visibleMeetings.map((meeting, index) => (
                  <tr key={`${meeting.nomeCliente}-${meeting.dataAgendamento}-${index}`}>
                    <td className="comercial-meetings-table__client">
                      {meeting.nomeCliente}
                    </td>
                    <td className="comercial-meetings-table__muted">
                      {displayCloser(meeting.nomeCloser)}
                    </td>
                    <td className="comercial-meetings-table__muted">
                      {displaySdr(meeting.nomeSdr)}
                    </td>
                    <td className="comercial-meetings-table__date">
                      {formatMeetingDate(meeting.dataAgendamento)}
                    </td>
                    <td>
                      <StatusBadge status={meeting.statusAgendamento} />
                    </td>
                    {showBitrixColumn && (
                      <td className="comercial-meetings-table__bitrix">
                        {meeting.bitrixDealId?.trim() || '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="comercial-meetings-table__more">
              <button
                type="button"
                className="qv-btn qv-btn--secondary"
                onClick={() => setVisibleCount((count) => count + MEETINGS_PAGE_SIZE)}
              >
                Exibir mais
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
