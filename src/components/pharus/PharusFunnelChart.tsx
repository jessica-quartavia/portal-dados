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

export default function PharusFunnelChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: d.step.label,
    clientes: d.count,
    phase: d.step.phase,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
        <CartesianGrid
          stroke={rechartsTheme.grid.stroke}
          strokeDasharray={rechartsTheme.grid.strokeDasharray}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          stroke={rechartsTheme.axis.stroke}
          tick={{ fill: qvColors.textMuted, fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          stroke={rechartsTheme.axis.stroke}
          tick={rechartsTheme.axis.tick}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={rechartsTheme.tooltip.contentStyle}
          labelStyle={rechartsTheme.tooltip.labelStyle}
          cursor={{ fill: 'rgba(244,121,32,0.08)' }}
          formatter={(value: number) => [value, 'Clientes']}
        />
        <Bar dataKey="clientes" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.phase === 'onboarding' ? qvCategorical[0] : qvCategorical[2]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
