/**
 * Gráfico de exemplo (ilha React) usando Recharts + o tema do design system.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { qvCategorical, rechartsTheme, qvColors } from "../../packages/design-system/charts-theme";

type Datum = { mes: string; receita: number; meta: number };

const data: Datum[] = [
  { mes: "Jan", receita: 320, meta: 300 },
  { mes: "Fev", receita: 280, meta: 300 },
  { mes: "Mar", receita: 410, meta: 350 },
  { mes: "Abr", receita: 390, meta: 350 },
  { mes: "Mai", receita: 470, meta: 400 },
  { mes: "Jun", receita: 520, meta: 450 },
];

const tooltipStyle = {
  contentStyle: {
    ...rechartsTheme.tooltip.contentStyle,
    borderRadius: 10,
    padding: "10px 14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
  },
  labelStyle: {
    ...rechartsTheme.tooltip.labelStyle,
    fontWeight: 600,
    marginBottom: 4,
  },
  cursor: { fill: "rgba(244,121,32,0.06)" },
};

export default function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis
          dataKey="mes"
          stroke="transparent"
          tick={{ fill: qvColors.textMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="transparent"
          tick={{ fill: qvColors.textMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          cursor={tooltipStyle.cursor}
        />
        <Legend wrapperStyle={rechartsTheme.legend.wrapperStyle} />
        <Bar dataKey="receita" name="Receita" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="meta"    name="Meta"    fill={qvCategorical[2]} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
