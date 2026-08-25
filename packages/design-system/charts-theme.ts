/**
 * Analytics QuartaVia — Tema de gráficos
 * Coral como destaque. Superfícies acompanham o tema CSS quando possível.
 */

export const qvColors = {
  primary: "#e85d3a",
  bg: "#141311",
  surface: "#1c1b18",
  surface2: "#252320",
  border: "#2f2c28",
  text: "#f5f2ed",
  textMuted: "#b5aea4",
  axis: "#81786e",
  grid: "#2f2c28",
} as const;

/** Paleta categórica — coral sempre como 1ª série / destaque. */
export const qvCategorical = [
  "#e85d3a",
  "#f3b5a4",
  "#8ab4f8",
  "#22a45a",
  "#c792ea",
  "#56d4dd",
  "#ea6c4c",
  "#d18426",
] as const;

/** Paleta sequencial (mapas de calor / intensidade) baseada no coral. */
export const qvSequential = [
  "#3a1610",
  "#7a2e1c",
  "#b84226",
  "#e85d3a",
  "#f3b5a4",
  "#f8d5cc",
] as const;

export const rechartsTheme = {
  grid: { stroke: qvColors.grid, strokeDasharray: "3 3" },
  axis: { stroke: qvColors.axis, tick: { fill: qvColors.textMuted, fontSize: 12 } },
  tooltip: {
    contentStyle: {
      backgroundColor: qvColors.surface2,
      border: `1px solid ${qvColors.border}`,
      borderRadius: 8,
      color: qvColors.text,
    },
    labelStyle: { color: qvColors.textMuted },
  },
  legend: { wrapperStyle: { color: qvColors.textMuted, fontSize: 12 } },
} as const;

export const echartsTheme = {
  color: [...qvCategorical],
  backgroundColor: "transparent",
  textStyle: { color: qvColors.textMuted, fontFamily: "Carme, Georgia, serif" },
  title: { textStyle: { color: qvColors.text, fontFamily: "Ubuntu, system-ui, sans-serif" } },
  legend: { textStyle: { color: qvColors.textMuted } },
  categoryAxis: {
    axisLine: { lineStyle: { color: qvColors.axis } },
    axisLabel: { color: qvColors.textMuted },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisLabel: { color: qvColors.textMuted },
    splitLine: { lineStyle: { color: qvColors.grid } },
  },
  tooltip: {
    backgroundColor: qvColors.surface2,
    borderColor: qvColors.border,
    textStyle: { color: qvColors.text },
  },
} as const;
