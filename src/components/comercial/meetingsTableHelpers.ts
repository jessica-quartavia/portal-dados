import type { ComercialMeetingRow } from '../../types/comercial';

export type MeetingsTableFilters = {
  cliente: string;
  closer: string;
  sdr: string;
  status: string;
  data: string;
};

export type StatusBadgeTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export const EMPTY_MEETINGS_FILTERS: MeetingsTableFilters = {
  cliente: '',
  closer: '',
  sdr: '',
  status: '',
  data: '',
};

export const MEETINGS_PAGE_SIZE = 30;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isEmptyPerson(value: string): boolean {
  const normalized = normalizeText(value);
  return !normalized || normalized === 'nao informado';
}

export function displayCloser(value: string): string {
  return isEmptyPerson(value) ? 'Sem Closer' : value;
}

export function displaySdr(value: string): string {
  return isEmptyPerson(value) ? 'Sem SDR' : value;
}

export function displayStatus(value: string): string {
  if (!value?.trim() || normalizeText(value) === 'nao informado') return 'Não informado';
  return value;
}

export function formatMeetingDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function getStatusBadgeTone(status: string): StatusBadgeTone {
  const normalized = normalizeText(status);

  if (
    normalized.includes('realizado') ||
    normalized.includes('comprou no pitch') ||
    normalized.includes('comprou c/ comercial')
  ) {
    return 'success';
  }

  if (normalized.includes('no-show') || normalized.includes('no show')) {
    return 'warning';
  }

  if (
    normalized.includes('cancelado') ||
    normalized.includes('desqualificado') ||
    normalized.includes('sem perfil')
  ) {
    return 'danger';
  }

  if (
    normalized.includes('agendado') ||
    normalized.includes('confirmado') ||
    normalized.includes('aguardando') ||
    normalized.includes('reagendado') ||
    normalized.includes('futur')
  ) {
    return 'info';
  }

  return 'neutral';
}

export function getStatusBadgeClass(tone: StatusBadgeTone): string {
  return `comercial-status-badge comercial-status-badge--${tone}`;
}

export function hasActiveMeetingsFilters(filters: MeetingsTableFilters): boolean {
  return Object.values(filters).some((value) => value.trim().length > 0);
}

export function filterMeetings(
  meetings: ComercialMeetingRow[],
  filters: MeetingsTableFilters,
): ComercialMeetingRow[] {
  const cliente = normalizeText(filters.cliente);
  const closer = normalizeText(filters.closer);
  const sdr = normalizeText(filters.sdr);
  const status = normalizeText(filters.status);
  const data = filters.data.trim();

  return meetings.filter((meeting) => {
    if (cliente && !normalizeText(meeting.nomeCliente).includes(cliente)) return false;
    if (closer && !normalizeText(meeting.nomeCloser).includes(closer)) return false;
    if (sdr && !normalizeText(meeting.nomeSdr).includes(sdr)) return false;
    if (status && !normalizeText(meeting.statusAgendamento).includes(status)) return false;
    if (data) {
      const meetingDate = meeting.dataAgendamento?.slice(0, 10) ?? '';
      if (meetingDate !== data) return false;
    }
    return true;
  });
}
