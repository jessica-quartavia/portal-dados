/**
 * Grupo Quarta Via — Tema de gráficos
 * Derivado de tokens.json. Reaproveite em qualquer biblioteca de data-viz
 * para manter a identidade visual (dark + laranja como destaque).
 */

export const qvColors = {
  primary: "#f47920",
  bg: "#0d0d0d",
  surface: "#1a1a1a",
  surface2: "#222222",
  border: "#2a2a2a",
  text: "#ffffff",
  textMuted: "#b3b3b3",
  axis: "#7a7a7a",
  grid: "#2a2a2a",
} as const;

/** Paleta categórica — laranja sempre como 1ª série / destaque. */
export const qvCategorical = [
  "#f47920",
  "#ffb066",
  "#8ab4f8",
  "#3fb950",
  "#c792ea",
  "#56d4dd",
  "#e5484d",
  "#f5a623",
] as const;

/** Paleta sequencial (mapas de calor / intensidade) baseada no laranja. */
export const qvSequential = [
  "#3a1e08",
  "#7a3d10",
  "#bf5613",
  "#f47920",
  "#ffb066",
  "#ffd1a6",
] as const;

/**
 * Tema pronto para Recharts (usado nos componentes de exemplo).
 * Aplique estas props nos eixos / grid / tooltip.
 */
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

/**
 * Tema pronto para ECharts — passe como segundo argumento de echarts.init
 * ou faça merge com a sua option.
 */
export const echartsTheme = {
  color: [...qvCategorical],
  backgroundColor: "transparent",
  textStyle: { color: qvColors.textMuted, fontFamily: "Inter, system-ui, sans-serif" },
  title: { textStyle: { color: qvColors.text } },
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
