/**
 * Gráfico de exemplo (ilha React) usando Recharts + o tema do design system.
 * Demonstra como consumir charts-theme.ts para manter a identidade visual.
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
import {
  qvCategorical,
  rechartsTheme,
} from "../../packages/design-system/charts-theme";

type Datum = { mes: string; receita: number; meta: number };

const data: Datum[] = [
  { mes: "Jan", receita: 320, meta: 300 },
  { mes: "Fev", receita: 280, meta: 300 },
  { mes: "Mar", receita: 410, meta: 350 },
  { mes: "Abr", receita: 390, meta: 350 },
  { mes: "Mai", receita: 470, meta: 400 },
  { mes: "Jun", receita: 520, meta: 450 },
];

export default function SalesChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis dataKey="mes" stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <YAxis stroke={rechartsTheme.axis.stroke} tick={rechartsTheme.axis.tick} />
        <Tooltip
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: "rgba(244,121,32,0.08)" }}
        />
        <Legend wrapperStyle={rechartsTheme.legend.wrapperStyle} />
        {/* Laranja = série principal (destaque) */}
        <Bar dataKey="receita" name="Receita" fill={qvCategorical[0]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="meta" name="Meta" fill={qvCategorical[2]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
