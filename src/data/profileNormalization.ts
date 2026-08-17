export const AGE_BANDS = [
  "Até 24 anos",
  "25 a 34 anos",
  "35 a 44 anos",
  "45 a 54 anos",
  "55 a 64 anos",
  "65+",
] as const;

export const INCOME_BANDS = [
  "Até 10k",
  "10k a 20k",
  "20k a 50k",
  "50k a 100k",
  "Acima de 100k",
] as const;

export const WEALTH_BANDS = [
  "Até 100k",
  "100k a 500k",
  "500k a 1M",
  "1M a 5M",
  "Acima de 5M",
] as const;

export const CONTRIBUTION_BANDS = [
  "Até 1k",
  "1k a 5k",
  "5k a 10k",
  "10k a 20k",
  "Acima de 20k",
] as const;

export type Audience = "qv360" | "infoproduto";

export type ProfileRecord = {
  id: string;
  audience: Audience;
  createdAt: string | null;
  age: number | null;
  income: number | null;
  gender: string | null;
  monthlyContribution: number | null;
  wealth: number | null;
  origin: string | null;
};

export type DistributionDatum = {
  faixa: string;
  qv360: number;
  infoproduto: number;
};

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/r\$/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMonetaryText(value: unknown): number | null {
  const direct = toNumber(value);
  if (direct !== null) return direct;
  if (typeof value !== "string") return null;

  const text = value.toLowerCase();
  const numbers = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) =>
    Number(match[0].replace(",", ".")),
  );
  if (!numbers.length) return null;

  const multiplier = text.includes("milhão") || text.includes("milhoes") ? 1_000_000 : text.includes("mil") ? 1_000 : 1;
  return (numbers.reduce((sum, number) => sum + number, 0) / numbers.length) * multiplier;
}

export function calculateAge(birthDate: unknown): number | null {
  if (typeof birthDate !== "string" || !birthDate) return null;
  const parsed = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDifference = today.getMonth() - parsed.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < parsed.getDate())) age -= 1;
  return age >= 0 && age <= 150 ? age : null;
}

export function normalizeGender(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  if (["m", "masculino", "homem"].includes(normalized)) return "Masculino";
  if (["f", "feminino", "mulher"].includes(normalized)) return "Feminino";
  if (["nao binario", "não binário", "não-binário", "nb"].includes(normalized)) return "Não binário";
  return "Outro";
}

export function ageBand(value: number | null): string | null {
  if (value === null) return null;
  if (value <= 24) return AGE_BANDS[0];
  if (value <= 34) return AGE_BANDS[1];
  if (value <= 44) return AGE_BANDS[2];
  if (value <= 54) return AGE_BANDS[3];
  if (value <= 64) return AGE_BANDS[4];
  return AGE_BANDS[5];
}

export function incomeBand(value: number | null): string | null {
  if (value === null) return null;
  if (value <= 10_000) return INCOME_BANDS[0];
  if (value <= 20_000) return INCOME_BANDS[1];
  if (value <= 50_000) return INCOME_BANDS[2];
  if (value <= 100_000) return INCOME_BANDS[3];
  return INCOME_BANDS[4];
}

export function wealthBand(value: number | null): string | null {
  if (value === null) return null;
  if (value <= 100_000) return WEALTH_BANDS[0];
  if (value <= 500_000) return WEALTH_BANDS[1];
  if (value <= 1_000_000) return WEALTH_BANDS[2];
  if (value <= 5_000_000) return WEALTH_BANDS[3];
  return WEALTH_BANDS[4];
}

export function contributionBand(value: number | null): string | null {
  if (value === null) return null;
  if (value <= 1_000) return CONTRIBUTION_BANDS[0];
  if (value <= 5_000) return CONTRIBUTION_BANDS[1];
  if (value <= 10_000) return CONTRIBUTION_BANDS[2];
  if (value <= 20_000) return CONTRIBUTION_BANDS[3];
  return CONTRIBUTION_BANDS[4];
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function createDistribution(
  qv360: ProfileRecord[],
  infoproduto: ProfileRecord[],
  bands: readonly string[],
  classifier: (record: ProfileRecord) => string | null,
): DistributionDatum[] {
  return bands.map((faixa) => ({
    faixa,
    qv360: qv360.filter((record) => classifier(record) === faixa).length,
    infoproduto: infoproduto.filter((record) => classifier(record) === faixa).length,
  }));
}
