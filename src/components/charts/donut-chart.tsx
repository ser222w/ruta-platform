'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function DonutChart({ data, colors = COLORS, valueFormatter, className }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        className={`flex items-center justify-center h-[200px] text-muted-foreground text-sm ${className ?? ''}`}
      >
        Немає даних
      </div>
    );
  }

  return (
    <ResponsiveContainer width='100%' height={200} className={className}>
      <PieChart>
        <Pie
          data={data}
          cx='50%'
          cy='50%'
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey='value'
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={valueFormatter ? (v: unknown) => [valueFormatter(Number(v)), ''] : undefined}
        />
        <Legend formatter={(value) => <span className='text-xs'>{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}
