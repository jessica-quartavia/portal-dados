import type {
  UserProgress,
  PhaseStep,
  StepDistribution,
  Kpis,
  BottleneckRow,
  ClientHistory,
  ClientStepEntry,
} from '../types/pharus';

export const PHARUS_STEPS: PhaseStep[] = [
  { step: 'personal_data',        order: 1, phase: 'onboarding',     label: 'Dados pessoais' },
  { step: 'contract',             order: 2, phase: 'onboarding',     label: 'Contrato' },
  { step: 'financial_profile',    order: 3, phase: 'onboarding',     label: 'Perfil financeiro' },
  { step: 'alignment',            order: 4, phase: 'onboarding',     label: 'Alinhamento' },
  { step: 'meet_advisor',         order: 5, phase: 'onboarding',     label: 'Reunião c/ advisor' },
  { step: 'complete',             order: 6, phase: 'pos_onboarding', label: 'Onboarding completo' },
  { step: 'patrimony_mapping',    order: 7, phase: 'pos_onboarding', label: 'Mapeamento patrimonial' },
  { step: 'behavioral_diagnosis', order: 8, phase: 'pos_onboarding', label: 'Diagnóstico comportamental' },
  { step: 'intelligence_center',  order: 9, phase: 'pos_onboarding', label: 'Central de inteligência' },
];

const LAST_ORDER = PHARUS_STEPS[PHARUS_STEPS.length - 1].order;
const stepByKey = new Map<string, PhaseStep>(PHARUS_STEPS.map((s) => [s.step, s]));
const stepByOrder = new Map<number, PhaseStep>(PHARUS_STEPS.map((s) => [s.order, s]));

// ─── Utilities ───────────────────────────────────────────────────────────────

function eventAt(record: UserProgress): Date {
  return new Date(record.completed_at ?? record.created_at);
}

function diffDays(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function diffHours(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function groupByUser(records: UserProgress[]): Map<string, UserProgress[]> {
  const map = new Map<string, UserProgress[]>();
  for (const r of records) {
    const list = map.get(r.user_id) ?? [];
    list.push(r);
    map.set(r.user_id, list);
  }
  return map;
}

function sortByOrder(records: UserProgress[]): UserProgress[] {
  return [...records].sort((a, b) => {
    const ao = stepByKey.get(a.step)?.order ?? 0;
    const bo = stepByKey.get(b.step)?.order ?? 0;
    return ao - bo;
  });
}

// ─── Current step ─────────────────────────────────────────────────────────────

/**
 * Current step = next step after the last completed one.
 *
 * Rules:
 * - Sort all completed records by order → take the highest.
 * - Current = next step in the official sequence (order + 1).
 * - If the client completed the final step (intelligence_center) → stays there.
 * - If no step is completed → fallback to the lowest registered step.
 */
export function getCurrentStepForUser(records: UserProgress[]): PhaseStep | null {
  if (records.length === 0) return null;

  const completed = records.filter((r) => r.completed_at != null);

  if (completed.length === 0) {
    // Fallback: earliest step in the data
    const sorted = sortByOrder(records);
    return stepByKey.get(sorted[0].step) ?? null;
  }

  // Highest completed step
  const lastCompleted = sortByOrder(completed).at(-1)!;
  const lastStep = stepByKey.get(lastCompleted.step);
  if (!lastStep) return null;

  // If completed the final step, current = that step (journey done)
  if (lastStep.order >= LAST_ORDER) return lastStep;

  // Current = next in official order
  return stepByOrder.get(lastStep.order + 1) ?? lastStep;
}

/** Map of userId → current PhaseStep. */
export function getCurrentStepByClient(records: UserProgress[]): Map<string, PhaseStep> {
  const byUser = groupByUser(records);
  const result = new Map<string, PhaseStep>();
  for (const [userId, rows] of byUser) {
    const step = getCurrentStepForUser(rows);
    if (step) result.set(userId, step);
  }
  return result;
}

// ─── Distributions ────────────────────────────────────────────────────────────

/**
 * Where each client currently is.
 * Exactly 1 entry per client → sum of all counts = total distinct users.
 */
export function getCurrentStepDistribution(records: UserProgress[]): StepDistribution[] {
  const stepMap = getCurrentStepByClient(records);
  const counts = new Map<string, number>();
  for (const step of stepMap.values()) {
    counts.set(step.step, (counts.get(step.step) ?? 0) + 1);
  }
  return PHARUS_STEPS.map((s) => ({ step: s, count: counts.get(s.step) ?? 0 }));
}

/**
 * Funnel: how many distinct users have a record for each step (reached or in progress).
 * Counts can exceed total clients because the same user appears in multiple steps.
 */
export function getFunnelProgress(records: UserProgress[]): StepDistribution[] {
  const usersByStep = new Map<string, Set<string>>();
  for (const r of records) {
    const set = usersByStep.get(r.step) ?? new Set<string>();
    set.add(r.user_id);
    usersByStep.set(r.step, set);
  }
  return PHARUS_STEPS.map((s) => ({
    step: s,
    count: usersByStep.get(s.step)?.size ?? 0,
  }));
}

/**
 * How many distinct users completed each step (completed_at filled).
 */
export function getCompletedByStep(records: UserProgress[]): StepDistribution[] {
  const usersByStep = new Map<string, Set<string>>();
  for (const r of records) {
    if (r.completed_at != null) {
      const set = usersByStep.get(r.step) ?? new Set<string>();
      set.add(r.user_id);
      usersByStep.set(r.step, set);
    }
  }
  return PHARUS_STEPS.map((s) => ({
    step: s,
    count: usersByStep.get(s.step)?.size ?? 0,
  }));
}

// ─── Bottlenecks ──────────────────────────────────────────────────────────────

/**
 * For each current step: how long are clients stuck there.
 *
 * "Stuck since" calculation per client:
 * - If a record exists for the current step with no completed_at → since created_at.
 * - If no record yet for the current step → since completed_at of the last completed step.
 * - Skip clients who have completed the final step (journey done).
 */
export function getStepBottlenecks(records: UserProgress[]): BottleneckRow[] {
  const now = new Date();
  const byUser = groupByUser(records);
  const currentStepMap = getCurrentStepByClient(records);
  const stepDurations = new Map<string, number[]>();

  for (const [userId, currentStep] of currentStepMap) {
    const userRows = byUser.get(userId) ?? [];
    const currentRecord = userRows.find((r) => r.step === currentStep.step);

    // Skip clients who finished the entire journey
    if (currentRecord?.completed_at != null) continue;

    let stuckSince: Date;
    if (currentRecord) {
      stuckSince = new Date(currentRecord.created_at);
    } else {
      // Inferred step: stuck since last completed step's completed_at
      const completedSorted = sortByOrder(userRows.filter((r) => r.completed_at != null));
      if (completedSorted.length === 0) continue;
      stuckSince = new Date(completedSorted.at(-1)!.completed_at!);
    }

    const days = Math.max(0, diffDays(stuckSince, now));
    const list = stepDurations.get(currentStep.step) ?? [];
    list.push(days);
    stepDurations.set(currentStep.step, list);
  }

  return PHARUS_STEPS.map((s) => {
    const durations = stepDurations.get(s.step) ?? [];
    if (durations.length === 0) return null;
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    return { step: s, clientCount: durations.length, avgDays: avg, maxDays: max };
  })
    .filter((r): r is BottleneckRow => r !== null)
    .sort((a, b) => b.avgDays - a.avgDays);
}

// ─── Transition time ──────────────────────────────────────────────────────────

/**
 * Average days between consecutive completed steps across all clients.
 */
export function getAverageTransitionTime(records: UserProgress[]): number {
  const byUser = groupByUser(records);
  let totalDays = 0;
  let count = 0;

  for (const [, userRows] of byUser) {
    const completed = sortByOrder(userRows.filter((r) => r.completed_at != null));
    for (let i = 1; i < completed.length; i++) {
      const days = diffDays(
        new Date(completed[i - 1].completed_at!),
        new Date(completed[i].completed_at!)
      );
      if (days >= 0) { totalDays += days; count++; }
    }
  }

  return count > 0 ? totalDays / count : 0;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function computeKpis(records: UserProgress[]): Kpis {
  const byUser = groupByUser(records);
  const currentStepMap = getCurrentStepByClient(records);
  let onboardingClients = 0;
  let posOnboardingClients = 0;

  for (const step of currentStepMap.values()) {
    if (step.phase === 'onboarding') onboardingClients++;
    else posOnboardingClients++;
  }

  const avgDays = getAverageTransitionTime(records);
  const bottlenecks = getStepBottlenecks(records);

  return {
    totalClients: byUser.size,
    onboardingClients,
    posOnboardingClients,
    avgDaysBetweenSteps: avgDays,
    biggestBottleneck: bottlenecks[0]?.step.label ?? '—',
  };
}

// ─── Client history ───────────────────────────────────────────────────────────

export function getClientHistory(records: UserProgress[], userId: string): ClientHistory {
  const userRecords = records.filter((r) => r.user_id === userId);
  const sorted = sortByOrder(userRecords);

  const steps: ClientStepEntry[] = sorted
    .map((r, i): ClientStepEntry | null => {
      const step = stepByKey.get(r.step);
      if (!step) return null;
      const eAt = eventAt(r);
      let durationHours: number | null = null;
      let durationDays: number | null = null;
      if (i > 0) {
        const prevEAt = eventAt(sorted[i - 1]);
        durationHours = diffHours(prevEAt, eAt);
        durationDays = diffDays(prevEAt, eAt);
      }
      return {
        step,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        eventAt: eAt.toISOString(),
        durationHours,
        durationDays,
      };
    })
    .filter((e): e is ClientStepEntry => e !== null);

  return { userId, steps, currentStep: getCurrentStepForUser(userRecords) };
}
