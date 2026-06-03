export interface UserProgress {
  id: string;
  user_id: string;
  step: string;
  created_at: string;
  completed_at: string | null;
}

export interface PhaseStep {
  step: string;
  order: number;
  phase: 'onboarding' | 'pos_onboarding';
  label: string;
}

export interface StepDistribution {
  step: PhaseStep;
  count: number;
}

export interface Kpis {
  totalClients: number;
  onboardingClients: number;
  posOnboardingClients: number;
  avgDaysBetweenSteps: number;
  biggestBottleneck: string;
}

export interface BottleneckRow {
  step: PhaseStep;
  clientCount: number;
  avgDays: number;
  maxDays: number;
}

export interface ClientStepEntry {
  step: PhaseStep;
  createdAt: string;
  completedAt: string | null;
  eventAt: string;
  durationHours: number | null;
  durationDays: number | null;
}

export interface ClientHistory {
  userId: string;
  steps: ClientStepEntry[];
  currentStep: PhaseStep | null;
}
