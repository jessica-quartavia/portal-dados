import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { rechartsTheme, qvCategorical, qvColors } from '../../../packages/design-system/charts-theme';
import type { StepDistribution } from '../../types/pharus';

interface Props {
  data: StepDistribution[];
}

const tooltipStyle = {
  contentStyle: {
    ...rechartsTheme.tooltip.contentStyle,
    borderRadius: 10,
    padding: '10px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
  },
  labelStyle: {
    ...rechartsTheme.tooltip.labelStyle,
    fontWeight: 600,
    marginBottom: 4,
  },
};

export default function PharusFunnelChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: d.step.label,
    clientes: d.count,
    phase: d.step.phase,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 72 }}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke="transparent"
          tick={{ fill: qvColors.textMuted, fontSize: 11 }}
          tickLine={false}
          angle={-38}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          stroke="transparent"
          tick={{ fill: qvColors.textMuted, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          cursor={{ fill: 'rgba(244,121,32,0.06)' }}
          formatter={(value: number) => [value, 'Clientes']}
        />
        <Bar dataKey="clientes" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.phase === 'onboarding' ? qvCategorical[0] : qvCategorical[2]}
              opacity={entry.clientes === 0 ? 0.25 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
