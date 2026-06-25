import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1_000;
const TODAY = new Date();

export const journeyStages = [
  "Onboarding",
  "Diagnóstico",
  "Rota Patrimonial",
  "Ativação das Engrenagens",
  "Central de Inteligência",
  "Concluído",
] as const;

export type JourneyStage = (typeof journeyStages)[number];
export type CompletenessLevel =
  | "Completo"
  | "Parcial"
  | "Baixo preenchimento"
  | "Sem dados financeiros";

export type SourceStatus = {
  source: string;
  available: boolean;
  rows: number;
  message: string;
};

type ProgressRow = {
  user_id: string;
  step: string | null;
  completed_at: string | null;
  created_at: string | null;
};

type MeetingRow = {
  id: string;
  meeting_slug?: string | null;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  duration_minutes?: number | null;
};

type ScheduledMeetingRow = {
  id: string;
  user_id: string | null;
  meeting_id: string | null;
  status: string | null;
  start_time: string | null;
  end_time: string | null;
  advisor_internal_id?: string | null;
  provider?: string | null;
  created_at?: string | null;
};

type EvaluationRow = {
  scheduled_meeting_id: string | null;
  user_id: string | null;
  stars: number | null;
  selected_quality_slugs: string[] | null;
  created_at?: string | null;
};

type FormSubmissionRow = {
  id: string;
  user_id: string | null;
  form_id?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
};

type UserEngineRow = {
  user_id: string;
  income?: number | string | null;
  reserve?: number | string | null;
  contribution?: number | string | null;
};

type UserIdRow = {
  user_id?: string | null;
  customer_id?: string | null;
  internal_id?: string | null;
};

type SchedulingAuditRow = {
  customer_id?: string | null;
  scheduled_meeting_id?: string | null;
  catalog_slug?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
};

type PersonalInfoRow = {
  user_id: string;
  name?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type CustomerJourneyRow = {
  id: string;
  maskedId: string;
  customerName: string;
  currentStage: JourneyStage;
  lastCompletedStage: string;
  nextExpectedStage: string;
  daysStopped: number | null;
  delayBand: string;
  completenessLevel: CompletenessLevel;
  completenessScore: number;
  advisorId: string;
  scheduleStatus: string;
  lastMovementAt: string | null;
  hasFutureMeeting: boolean;
  meetingTypes: string[];
};

export type DashboardMetrics = {
  configured: boolean;
  loadedAt: string;
  sourceStatuses: SourceStatus[];
  warnings: string[];
  statusValues: string[];
  meetingTypes: { id: string; label: string; slug: string }[];
  filters: {
    stages: JourneyStage[];
    statuses: string[];
    meetingTypes: string[];
    advisors: string[];
    completenessLevels: CompletenessLevel[];
  };
  customers: CustomerJourneyRow[];
  overview: {
    totalCustomers: number;
    activeCustomers: number;
    concludedCustomers: number;
    totalConversion: number;
    averageTotalDays: number | null;
    averageTotalBase: number;
    financialCompletePercent: number;
  };
  funnel: {
    stage: string;
    count: number;
    totalPercent: number;
    previousPercent: number;
  }[];
  conversions: {
    label: string;
    value: number;
    from: number;
    to: number;
  }[];
  stageDurations: {
    label: string;
    averageDays: number | null;
    base: number;
  }[];
  financial: {
    completePercent: number;
    incompletePercent: number;
    levels: { level: CompletenessLevel; count: number; percent: number }[];
    missingFields: { field: string; missing: number; percent: number; available: boolean }[];
  };
  evaluations: {
    byMeeting: {
      meetingType: string;
      averageStars: number | null;
      count: number;
    }[];
    qualityTags: { label: string; count: number; sentiment: "positive" | "negative" }[];
    smallSample: boolean;
  };
  operational: {
    alerts: {
      label: string;
      value: number;
      detail: string;
    }[];
    delayBands: { band: string; count: number }[];
  };
};

function configuredClient(): SupabaseClient | null {
  const url = import.meta.env.PUBLIC_SUPABASE_PHARUS_URL ?? import.meta.env.PUBLIC_PHARUS_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PHARUS_ANON_KEY ?? import.meta.env.PUBLIC_PHARUS_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchAll<T>(
  client: SupabaseClient,
  schema: string,
  table: string,
  select: string,
): Promise<{ rows: T[]; status: SourceStatus }> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .schema(schema)
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return {
        rows: [],
        status: {
          source: `${schema}.${table}`,
          available: false,
          rows: 0,
          message: error.message,
        },
      };
    }

    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return {
    rows,
    status: {
      source: `${schema}.${table}`,
      available: true,
      rows: rows.length,
      message: `${rows.length.toLocaleString("pt-BR")} registros visíveis`,
    },
  };
}

async function fetchWithFallback<T>(
  client: SupabaseClient,
  schema: string,
  table: string,
  selects: string[],
): Promise<{ rows: T[]; status: SourceStatus }> {
  let lastStatus: SourceStatus | null = null;
  for (const select of selects) {
    const result = await fetchAll<T>(client, schema, table, select);
    if (result.status.available) return result;
    lastStatus = result.status;
    if (!/does not exist|column/i.test(result.status.message)) break;
  }
  return {
    rows: [],
    status:
      lastStatus ?? {
        source: `${schema}.${table}`,
        available: false,
        rows: 0,
        message: "Consulta não retornou dados.",
      },
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function isPositive(value: unknown): boolean {
  const number = toNumber(value);
  return number !== null && number > 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function daysBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, (end.getTime() - start.getTime()) / 86_400_000);
}

function latest(dates: Array<Date | null>): Date | null {
  const valid = dates.filter(Boolean) as Date[];
  if (!valid.length) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function earliest(dates: Array<Date | null>): Date | null {
  const valid = dates.filter(Boolean) as Date[];
  if (!valid.length) return null;
  return new Date(Math.min(...valid.map((date) => date.getTime())));
}

function average(values: Array<number | null>): { average: number | null; base: number } {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!valid.length) return { average: null, base: 0 };
  return {
    average: valid.reduce((sum, value) => sum + value, 0) / valid.length,
    base: valid.length,
  };
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

function maskId(id: string): string {
  if (id.length <= 8) return `<${id}>`;
  return `cli-${id.slice(0, 4)}…${id.slice(-4)}`;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const meetingSlugLabels: Record<string, string> = {
  "intelligence-center-release": "Central de Inteligência",
  "wealth-route": "Rota Patrimonial",
  "gears-activation": "Ativação das Engrenagens",
};

const qualityLabels: Record<string, string> = {
  Empathy: "Empatia",
  Clarity: "Clareza",
  "Patrimonial Engineer Demeanor": "Postura do Engenheiro Patrimonial",
  "Meeting Facilitation": "Condução da Reunião",
  "Focus On My Case": "Foco no Meu Caso",
  "Presented Content": "Conteúdo Apresentado",
  "Technical Depth": "Profundidade Técnica",
  "Supporting Materials": "Materiais de Apoio",
  Positive: "Positivo",
  Negative: "Negativo",
  Neutral: "Neutro",
};

function friendlyLabel(value: string | null | undefined): string {
  if (!value) return "";
  const direct = qualityLabels[value] ?? qualityLabels[value.replace(/[-_]/g, " ")];
  if (direct) return direct;
  return value
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeMeetingLabel(raw: string | null | undefined): string {
  if (raw && meetingSlugLabels[raw]) return meetingSlugLabels[raw];
  const value = normalizeText(raw);
  if (!value) return "Reunião não classificada";
  if (value.includes("rota") || value.includes("patrimonial") || value.includes("patrimony")) {
    return "Rota Patrimonial";
  }
  if (value.includes("ativacao") || value.includes("engren")) {
    return "Ativação das Engrenagens";
  }
  if (value.includes("central") || value.includes("intelig")) {
    return "Central de Inteligência";
  }
  if (value.includes("diagn")) return "Diagnóstico";
  if (value.includes("onboarding")) return "Onboarding";
  if (value.includes("advisor") || value.includes("consult")) return "Central de Inteligência";
  return raw
    ? raw
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Reunião não classificada";
}

function isCompletedStatus(status: string | null | undefined): boolean {
  const value = normalizeText(status);
  return ["completed", "complete", "concluido", "concluida", "done", "finished", "realizada", "finalizada"].some(
    (term) => value.includes(term),
  );
}

function isCancelledStatus(status: string | null | undefined): boolean {
  const value = normalizeText(status);
  return ["cancel", "canceled", "cancelled", "no_show", "noshow"].some((term) => value.includes(term));
}

function isActiveMeetingStatus(status: string | null | undefined): boolean {
  return !isCancelledStatus(status);
}

function delayBand(days: number | null): string {
  if (days === null) return "Sem movimentação";
  if (days <= 7) return "0 a 7 dias";
  if (days <= 15) return "8 a 15 dias";
  if (days <= 30) return "16 a 30 dias";
  return "Mais de 30 dias";
}

function classifyCompleteness(score: number): CompletenessLevel {
  if (score === 0) return "Sem dados financeiros";
  if (score >= 0.8) return "Completo";
  if (score >= 0.4) return "Parcial";
  return "Baixo preenchimento";
}

function pct(value: number, total: number): number {
  return total > 0 ? value / total : 0;
}

function buildMetrics(params: {
  progress: ProgressRow[];
  meetings: MeetingRow[];
  scheduledMeetings: ScheduledMeetingRow[];
  evaluations: EvaluationRow[];
  formSubmissions: FormSubmissionRow[];
  userEngines: UserEngineRow[];
  transactions: UserIdRow[];
  accounts: UserIdRow[];
  investments: UserIdRow[];
  debts: UserIdRow[];
  allocations: UserIdRow[];
  schedulingAudit: SchedulingAuditRow[];
  personalInfo: PersonalInfoRow[];
  statuses: SourceStatus[];
}): DashboardMetrics {
  const warnings = params.statuses
    .filter((status) => !status.available)
    .map((status) => `${status.source}: ${status.message}`);
  const meetingById = new Map(
    params.meetings.map((meeting) => [
      meeting.id,
      {
        id: meeting.id,
        slug: meeting.meeting_slug ?? meeting.slug ?? meeting.name ?? meeting.title ?? meeting.id,
        label: normalizeMeetingLabel(meeting.meeting_slug ?? meeting.slug ?? meeting.name ?? meeting.title),
      },
    ]),
  );
  const auditByScheduledMeeting = new Map(
    params.schedulingAudit
      .filter((row) => row.scheduled_meeting_id && row.catalog_slug)
      .map((row) => [row.scheduled_meeting_id as string, normalizeMeetingLabel(row.catalog_slug)]),
  );
  const auditLabelsByCustomer = new Map<string, string[]>();
  for (const row of params.schedulingAudit) {
    if (!row.customer_id || !row.catalog_slug) continue;
    auditLabelsByCustomer.set(row.customer_id, [
      ...(auditLabelsByCustomer.get(row.customer_id) ?? []),
      normalizeMeetingLabel(row.catalog_slug),
    ]);
  }
  const nameByUser = new Map(
    params.personalInfo.map((row) => {
      const fullName = row.full_name ?? row.name ?? [row.first_name, row.last_name].filter(Boolean).join(" ");
      return [row.user_id, fullName?.trim() || ""];
    }),
  );
  const userIds = new Set<string>();

  [
    ...params.progress.map((row) => row.user_id),
    ...params.scheduledMeetings.map((row) => row.user_id),
    ...params.evaluations.map((row) => row.user_id),
    ...params.formSubmissions.map((row) => row.user_id),
    ...params.userEngines.map((row) => row.user_id),
    ...params.transactions.map((row) => row.user_id),
    ...params.accounts.map((row) => row.user_id),
    ...params.investments.map((row) => row.user_id),
    ...params.debts.map((row) => row.user_id),
    ...params.allocations.map((row) => row.customer_id),
  ].forEach((id) => {
    if (id) userIds.add(id);
  });

  const progressByUser = new Map<string, ProgressRow[]>();
  for (const row of params.progress) {
    if (!row.user_id) continue;
    progressByUser.set(row.user_id, [...(progressByUser.get(row.user_id) ?? []), row]);
  }

  const meetingsByUser = new Map<string, ScheduledMeetingRow[]>();
  for (const row of params.scheduledMeetings) {
    if (!row.user_id) continue;
    meetingsByUser.set(row.user_id, [...(meetingsByUser.get(row.user_id) ?? []), row]);
  }

  const enginesByUser = new Map(params.userEngines.map((row) => [row.user_id, row]));
  const advisorByCustomer = new Map(
    params.allocations
      .filter((row) => row.customer_id && row.internal_id)
      .map((row) => [row.customer_id as string, row.internal_id as string]),
  );
  const transactionsUsers = new Set(params.transactions.flatMap((row) => (row.user_id ? [row.user_id] : [])));
  const accountUsers = new Set(params.accounts.flatMap((row) => (row.user_id ? [row.user_id] : [])));
  const investmentUsers = new Set(params.investments.flatMap((row) => (row.user_id ? [row.user_id] : [])));
  const debtUsers = new Set(params.debts.flatMap((row) => (row.user_id ? [row.user_id] : [])));

  const sourceAvailable = {
    engines: params.statuses.find((status) => status.source === "core.user_engines")?.available ?? false,
    transactions: params.statuses.find((status) => status.source === "core.transactions")?.available ?? false,
    accounts: params.statuses.find((status) => status.source === "core.accounts")?.available ?? false,
    investments: params.investments.length > 0,
    debts: params.debts.length > 0,
    meetings: params.statuses.find((status) => status.source === "core.scheduled_meetings")?.available ?? false,
  };

  const stageDates = new Map<
    string,
    {
      onboarding: Date | null;
      diagnosis: Date | null;
      route: Date | null;
      activation: Date | null;
      central: Date | null;
      concluded: Date | null;
    }
  >();

  const customers: CustomerJourneyRow[] = [...userIds].map((id) => {
    const progress = progressByUser.get(id) ?? [];
    const scheduled = meetingsByUser.get(id) ?? [];
    const visibleMeetingTypes = unique(
      [
        ...scheduled.map((row) => auditByScheduledMeeting.get(row.id) ?? (row.meeting_id ? meetingById.get(row.meeting_id)?.label : null)),
        ...(auditLabelsByCustomer.get(id) ?? []),
      ],
    );
    const stepDate = (stepNames: string[]) =>
      latest(
        progress
          .filter((row) => stepNames.includes(row.step ?? ""))
          .map((row) => parseDate(row.completed_at) ?? parseDate(row.created_at)),
      );
    const completedMeetingDate = (labels: string[]) =>
      latest(
        scheduled
          .filter((row) => {
            const auditLabel = auditByScheduledMeeting.get(row.id);
            const meeting = row.meeting_id ? meetingById.get(row.meeting_id) : null;
            const label = auditLabel ?? meeting?.label ?? "";
            return labels.includes(label) && isCompletedStatus(row.status);
          })
          .map((row) => parseDate(row.end_time) ?? parseDate(row.start_time) ?? parseDate(row.created_at)),
      );
    const reachedMeetingDate = (labels: string[]) =>
      latest(
        scheduled
          .filter((row) => {
            const auditLabel = auditByScheduledMeeting.get(row.id);
            const meeting = row.meeting_id ? meetingById.get(row.meeting_id) : null;
            const label = auditLabel ?? meeting?.label ?? "";
            return labels.includes(label) && isActiveMeetingStatus(row.status);
          })
          .map((row) => parseDate(row.end_time) ?? parseDate(row.start_time) ?? parseDate(row.created_at)),
      );

    const auditReachedDate = (labels: string[]) =>
      params.schedulingAudit.some((row) => row.customer_id === id && row.catalog_slug && labels.includes(normalizeMeetingLabel(row.catalog_slug)))
        ? latest(
            params.schedulingAudit
              .filter((row) => row.customer_id === id && row.catalog_slug && labels.includes(normalizeMeetingLabel(row.catalog_slug)))
              .map((row) => parseDate(row.processed_at) ?? parseDate(row.created_at)),
          )
        : null;

    const onboarding = stepDate(["personal_data", "contract", "financial_profile", "alignment"]);
    const diagnosis = latest([stepDate(["behavioral_diagnosis"]), params.formSubmissions.some((row) => row.user_id === id) ? earliest(params.formSubmissions.filter((row) => row.user_id === id).map((row) => parseDate(row.submitted_at) ?? parseDate(row.created_at))) : null]);
    const route = latest([stepDate(["patrimony_mapping"]), reachedMeetingDate(["Rota Patrimonial"]), auditReachedDate(["Rota Patrimonial"])]);
    const activation = latest([stepDate(["meet_advisor"]), reachedMeetingDate(["Ativação das Engrenagens"]), auditReachedDate(["Ativação das Engrenagens"])]);
    const central = latest([reachedMeetingDate(["Central de Inteligência"]), auditReachedDate(["Central de Inteligência"])]);
    const centralCompleted = completedMeetingDate(["Central de Inteligência"]);
    const concluded = latest([stepDate(["complete"]), centralCompleted]);

    stageDates.set(id, { onboarding, diagnosis, route, activation, central, concluded });

    let currentStage: JourneyStage = "Onboarding";
    if (diagnosis) currentStage = "Diagnóstico";
    if (route) currentStage = "Rota Patrimonial";
    if (activation) currentStage = "Ativação das Engrenagens";
    if (central) currentStage = "Central de Inteligência";
    if (centralCompleted || concluded) currentStage = "Concluído";

    const completedPairs = [
      ["Concluído", concluded],
      ["Central de Inteligência", central],
      ["Ativação das Engrenagens", activation],
      ["Rota Patrimonial", route],
      ["Diagnóstico", diagnosis],
      ["Onboarding", onboarding],
    ] as const;
    const lastCompletedStage = completedPairs.find(([, date]) => Boolean(date))?.[0] ?? "Sem etapa concluída";
    const nextExpectedStage = currentStage === "Concluído" ? "Jornada concluída" : currentStage;
    const lastMovement = latest([onboarding, diagnosis, route, activation, central, concluded]);
    const daysStopped = currentStage === "Concluído" ? null : daysBetween(lastMovement, TODAY);
    const futureMeeting = scheduled.some((row) => {
      const start = parseDate(row.start_time);
      return Boolean(start && start > TODAY && !isCancelledStatus(row.status));
    });
    const engine = enginesByUser.get(id);
    const financialBlocks = [
      sourceAvailable.engines && isPositive(engine?.income),
      sourceAvailable.engines && isPositive(engine?.reserve),
      sourceAvailable.engines && isPositive(engine?.contribution),
      sourceAvailable.transactions && transactionsUsers.has(id),
      sourceAvailable.accounts && accountUsers.has(id),
      sourceAvailable.investments && investmentUsers.has(id),
      sourceAvailable.debts && debtUsers.has(id),
    ];
    const score = financialBlocks.filter(Boolean).length / financialBlocks.length;

    return {
      id,
      maskedId: maskId(id),
      customerName: nameByUser.get(id) || `Cliente ${maskId(id)}`,
      currentStage,
      lastCompletedStage,
      nextExpectedStage,
      daysStopped,
      delayBand: currentStage === "Concluído" ? "Concluído" : delayBand(daysStopped),
      completenessLevel: classifyCompleteness(score),
      completenessScore: score,
      advisorId: advisorByCustomer.get(id) ? maskId(advisorByCustomer.get(id) as string) : "Sem consultor visível",
      scheduleStatus: futureMeeting ? "Agendado" : scheduled.length ? "Sem agenda futura" : "Sem agendamento visível",
      lastMovementAt: dateIso(lastMovement),
      hasFutureMeeting: futureMeeting,
      meetingTypes: visibleMeetingTypes,
    };
  });

  const completed = {
    registered: customers.length,
    onboarding: [...stageDates.values()].filter((dates) => dates.onboarding).length,
    diagnosis: [...stageDates.values()].filter((dates) => dates.diagnosis).length,
    route: [...stageDates.values()].filter((dates) => dates.route).length,
    activation: [...stageDates.values()].filter((dates) => dates.activation).length,
    central: [...stageDates.values()].filter((dates) => dates.concluded).length,
    concluded: [...stageDates.values()].filter((dates) => dates.concluded).length,
  };
  const funnel = [
    ["Clientes cadastrados", completed.registered],
    ["Onboarding concluído", completed.onboarding],
    ["Diagnóstico concluído", completed.diagnosis],
    ["Rota Patrimonial realizada", completed.route],
    ["Ativação realizada", completed.activation],
    ["Central realizada", completed.central],
    ["Concluído", completed.concluded],
  ].map(([stage, count], index, list) => ({
    stage: String(stage),
    count: Number(count),
    totalPercent: pct(Number(count), completed.registered),
    previousPercent: index === 0 ? 1 : pct(Number(count), Number(list[index - 1][1])),
  }));

  const conversions = funnel.slice(1).map((item, index) => ({
    label: `${funnel[index].stage.replace("Clientes ", "")} → ${item.stage.replace(" concluído", "").replace(" realizada", "")}`,
    value: item.previousPercent,
    from: funnel[index].count,
    to: item.count,
  }));

  const durationValues = [...stageDates.values()];
  const onboardingToRoute = average(durationValues.map((dates) => daysBetween(dates.onboarding, dates.route)));
  const routeToActivation = average(durationValues.map((dates) => daysBetween(dates.route, dates.activation)));
  const activationToCentral = average(durationValues.map((dates) => daysBetween(dates.activation, dates.concluded)));
  const totalJourney = average(durationValues.map((dates) => daysBetween(dates.onboarding, dates.concluded)));
  const stageDurations = [
    { label: "Onboarding → Rota Patrimonial", averageDays: onboardingToRoute.average, base: onboardingToRoute.base },
    { label: "Rota Patrimonial → Ativação", averageDays: routeToActivation.average, base: routeToActivation.base },
    { label: "Ativação → Central", averageDays: activationToCentral.average, base: activationToCentral.base },
    { label: "Onboarding → Central", averageDays: totalJourney.average, base: totalJourney.base },
  ];

  const completenessLevels: CompletenessLevel[] = [
    "Completo",
    "Parcial",
    "Baixo preenchimento",
    "Sem dados financeiros",
  ];
  const levels = completenessLevels.map((level) => {
    const count = customers.filter((customer) => customer.completenessLevel === level).length;
    return { level, count, percent: pct(count, customers.length) };
  });
  const completeCount = levels.find((level) => level.level === "Completo")?.count ?? 0;
  const missingFields = [
    {
      field: "Renda",
      missing: customers.filter((customer) => !isPositive(enginesByUser.get(customer.id)?.income)).length,
      available: sourceAvailable.engines,
    },
    {
      field: "Reserva",
      missing: customers.filter((customer) => !isPositive(enginesByUser.get(customer.id)?.reserve)).length,
      available: sourceAvailable.engines,
    },
    {
      field: "Contribuição/aporte",
      missing: customers.filter((customer) => !isPositive(enginesByUser.get(customer.id)?.contribution)).length,
      available: sourceAvailable.engines,
    },
    {
      field: "Transações/despesas",
      missing: customers.filter((customer) => !transactionsUsers.has(customer.id)).length,
      available: sourceAvailable.transactions,
    },
    {
      field: "Contas",
      missing: customers.filter((customer) => !accountUsers.has(customer.id)).length,
      available: sourceAvailable.accounts,
    },
    {
      field: "Patrimônio/investimentos",
      missing: customers.filter((customer) => !investmentUsers.has(customer.id)).length,
      available: sourceAvailable.investments,
    },
    {
      field: "Dívidas/financiamentos",
      missing: customers.filter((customer) => !debtUsers.has(customer.id)).length,
      available: sourceAvailable.debts,
    },
  ]
    .map((item) => ({ ...item, percent: pct(item.missing, customers.length) }))
    .sort((a, b) => b.missing - a.missing);

  const scheduledById = new Map(params.scheduledMeetings.map((row) => [row.id, row]));
  const evalByMeeting = new Map<string, EvaluationRow[]>();
  for (const evaluation of params.evaluations) {
    const scheduled = evaluation.scheduled_meeting_id ? scheduledById.get(evaluation.scheduled_meeting_id) : null;
    const meeting = scheduled?.meeting_id ? meetingById.get(scheduled.meeting_id) : null;
    const label = meeting?.label ?? "Reunião não classificada";
    evalByMeeting.set(label, [...(evalByMeeting.get(label) ?? []), evaluation]);
  }
  const byMeeting = ["Rota Patrimonial", "Ativação das Engrenagens", "Central de Inteligência"].map((label) => {
    const rows = evalByMeeting.get(label) ?? [];
    const values = rows.flatMap((row) => (row.stars === null ? [] : [Number(row.stars)]));
    return {
      meetingType: label,
      averageStars: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
      count: rows.length,
    };
  });
  const tagCounts = new Map<string, number>();
  for (const evaluation of params.evaluations) {
    for (const tag of evaluation.selected_quality_slugs ?? []) {
      const label = friendlyLabel(tag);
      tagCounts.set(label, (tagCounts.get(label) ?? 0) + 1);
    }
  }
  const qualityTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({
      label,
      count,
      sentiment: /ruim|atras|confus|falta|neg/i.test(label) ? "negative" : "positive",
    })) as { label: string; count: number; sentiment: "positive" | "negative" }[];

  const noRouteScheduled = customers.filter((customer) => {
    const dates = stageDates.get(customer.id);
    return !dates?.route && !customer.hasFutureMeeting && customer.currentStage !== "Concluído";
  }).length;
  const noActivationScheduled = customers.filter((customer) => {
    const dates = stageDates.get(customer.id);
    return dates?.route && !dates.activation && !customer.hasFutureMeeting && customer.currentStage !== "Concluído";
  }).length;
  const noCentralScheduled = customers.filter((customer) => {
    const dates = stageDates.get(customer.id);
    return dates?.activation && !dates.concluded && !customer.hasFutureMeeting && customer.currentStage !== "Concluído";
  }).length;
  const stopped = (days: number) =>
    customers.filter((customer) => customer.currentStage !== "Concluído" && (customer.daysStopped ?? 0) > days).length;
  const delayBands = ["0 a 7 dias", "8 a 15 dias", "16 a 30 dias", "Mais de 30 dias"].map((band) => ({
    band,
    count: customers.filter((customer) => customer.delayBand === band).length,
  }));

  return {
    configured: true,
    loadedAt: new Date().toISOString(),
    sourceStatuses: params.statuses,
    warnings,
    statusValues: unique(params.scheduledMeetings.map((row) => row.status)),
    meetingTypes: [...meetingById.values()],
    filters: {
      stages: [...journeyStages],
      statuses: unique(params.scheduledMeetings.map((row) => row.status)),
      meetingTypes: unique([...meetingById.values()].map((meeting) => meeting.label)),
      advisors: unique(customers.map((customer) => customer.advisorId)),
      completenessLevels,
    },
    customers,
    overview: {
      totalCustomers: customers.length,
      activeCustomers: customers.filter((customer) => customer.currentStage !== "Concluído").length,
      concludedCustomers: completed.concluded,
      totalConversion: pct(completed.concluded, completed.registered),
      averageTotalDays: totalJourney.average,
      averageTotalBase: totalJourney.base,
      financialCompletePercent: pct(completeCount, customers.length),
    },
    funnel,
    conversions,
    stageDurations,
    financial: {
      completePercent: pct(completeCount, customers.length),
      incompletePercent: customers.length ? 1 - pct(completeCount, customers.length) : 0,
      levels,
      missingFields,
    },
    evaluations: {
      byMeeting,
      qualityTags,
      smallSample: params.evaluations.length > 0 && params.evaluations.length < 30,
    },
    operational: {
      alerts: [
        { label: "Sem Rota Patrimonial agendada", value: noRouteScheduled, detail: "Clientes antes da Rota sem agenda futura visível" },
        { label: "Sem Ativação agendada", value: noActivationScheduled, detail: "Clientes após Rota sem ativação futura visível" },
        { label: "Sem Central agendada", value: noCentralScheduled, detail: "Clientes após ativação sem Central futura visível" },
        { label: "Parados +7 dias", value: stopped(7), detail: "Exclui clientes concluídos" },
        { label: "Parados +15 dias", value: stopped(15), detail: "Exclui clientes concluídos" },
        { label: "Parados +30 dias", value: stopped(30), detail: "Exclui clientes concluídos" },
      ],
      delayBands,
    },
  };
}

export async function loadPharusJourney(): Promise<DashboardMetrics> {
  const client = configuredClient();
  if (!client) {
    return {
      configured: false,
      loadedAt: new Date().toISOString(),
      sourceStatuses: [],
      warnings: ["Configure PUBLIC_SUPABASE_PHARUS_URL e PUBLIC_SUPABASE_PHARUS_ANON_KEY para carregar dados reais."],
      statusValues: [],
      meetingTypes: [],
      filters: {
        stages: [...journeyStages],
        statuses: [],
        meetingTypes: [],
        advisors: [],
        completenessLevels: ["Completo", "Parcial", "Baixo preenchimento", "Sem dados financeiros"],
      },
      customers: [],
      overview: {
        totalCustomers: 0,
        activeCustomers: 0,
        concludedCustomers: 0,
        totalConversion: 0,
        averageTotalDays: null,
        averageTotalBase: 0,
        financialCompletePercent: 0,
      },
      funnel: [],
      conversions: [],
      stageDurations: [],
      financial: {
        completePercent: 0,
        incompletePercent: 0,
        levels: [],
        missingFields: [],
      },
      evaluations: {
        byMeeting: [],
        qualityTags: [],
        smallSample: false,
      },
      operational: {
        alerts: [],
        delayBands: [],
      },
    };
  }

  const [
    progress,
    meetings,
    scheduledMeetings,
    evaluations,
    formSubmissions,
    userEngines,
    transactions,
    accounts,
    fixedIncome,
    equities,
    investmentFunds,
    privatePensions,
    realEstateAssets,
    movableAssets,
    otherInvestments,
    loans,
    financings,
    consortia,
    allocations,
    schedulingAudit,
    personalInfo,
  ] = await Promise.all([
    fetchAll<ProgressRow>(client, "core", "user_progress", "user_id,step,completed_at,created_at"),
    fetchWithFallback<MeetingRow>(client, "core", "meetings", [
      "id,meeting_slug,duration_minutes",
      "id,slug,duration_minutes",
      "id,name,duration_minutes",
      "id,title,duration_minutes",
      "id",
    ]),
    fetchWithFallback<ScheduledMeetingRow>(client, "core", "scheduled_meetings", [
      "id,user_id,meeting_id,status,start_time,end_time,advisor_internal_id,provider,created_at",
      "id,user_id,meeting_id,status,start_time,end_time,provider,created_at",
      "id,user_id,meeting_id,status,start_time,end_time",
    ]),
    fetchWithFallback<EvaluationRow>(client, "core", "scheduled_meeting_evaluation", [
      "scheduled_meeting_id,user_id,stars,selected_quality_slugs,created_at",
      "scheduled_meeting_id,user_id,stars,selected_quality_slugs",
      "scheduled_meeting_id,user_id,stars",
    ]),
    fetchWithFallback<FormSubmissionRow>(client, "core", "form_submissions", [
      "id,user_id,form_id,submitted_at,created_at",
      "id,user_id,form_id,created_at",
      "id,user_id",
    ]),
    fetchWithFallback<UserEngineRow>(client, "core", "user_engines", [
      "user_id,income,reserve,contribution",
      "user_id,income,reserve",
      "user_id",
    ]),
    fetchWithFallback<UserIdRow>(client, "core", "transactions", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "accounts", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "fixed_income", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "equities", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "investment_funds", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "private_pensions", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "real_estate_assets", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "movable_assets", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "other_investments", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "loans", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "financings", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "core", "consortia", ["user_id"]),
    fetchWithFallback<UserIdRow>(client, "backoffice", "internals_customers_allocations", [
      "customer_id,internal_id,alocation_date",
      "customer_id,internal_id",
    ]),
    fetchWithFallback<SchedulingAuditRow>(client, "core", "scheduling_booking_audit", [
      "customer_id,scheduled_meeting_id,catalog_slug,processed_at,created_at",
      "customer_id,scheduled_meeting_id,catalog_slug,created_at",
      "customer_id,catalog_slug",
      "scheduled_meeting_id,catalog_slug",
    ]),
    fetchWithFallback<PersonalInfoRow>(client, "core", "personal_info", [
      "user_id,full_name",
      "user_id,name",
      "user_id,first_name,last_name",
      "user_id",
    ]),
  ]);

  const investments = [
    ...fixedIncome.rows,
    ...equities.rows,
    ...investmentFunds.rows,
    ...privatePensions.rows,
    ...realEstateAssets.rows,
    ...movableAssets.rows,
    ...otherInvestments.rows,
  ];
  const debts = [...loans.rows, ...financings.rows, ...consortia.rows];

  return buildMetrics({
    progress: progress.rows,
    meetings: meetings.rows,
    scheduledMeetings: scheduledMeetings.rows,
    evaluations: evaluations.rows,
    formSubmissions: formSubmissions.rows,
    userEngines: userEngines.rows,
    transactions: transactions.rows,
    accounts: accounts.rows,
    investments,
    debts,
    allocations: allocations.rows,
    schedulingAudit: schedulingAudit.rows,
    personalInfo: personalInfo.rows,
    statuses: [
      progress.status,
      meetings.status,
      scheduledMeetings.status,
      evaluations.status,
      formSubmissions.status,
      userEngines.status,
      transactions.status,
      accounts.status,
      fixedIncome.status,
      equities.status,
      investmentFunds.status,
      privatePensions.status,
      realEstateAssets.status,
      movableAssets.status,
      otherInvestments.status,
      loans.status,
      financings.status,
      consortia.status,
      allocations.status,
      schedulingAudit.status,
      personalInfo.status,
    ],
  });
}
