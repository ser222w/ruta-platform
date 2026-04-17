'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface BarChartProps {
  data: Array<Record<string, string | number>>;
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  stacked?: boolean;
  className?: string;
}

export function BarChart({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter,
  stacked = false,
  className
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-[200px] text-muted-foreground text-sm ${className ?? ''}`}
      >
        Немає даних
      </div>
    );
  }

  return (
    <ResponsiveContainer width='100%' height={220} className={className}>
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' vertical={false} />
        <XAxis dataKey={index} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={valueFormatter}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          formatter={valueFormatter ? (v: unknown) => [valueFormatter(Number(v)), ''] : undefined}
        />
        {categories.length > 1 && <Legend />}
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={colors[i % colors.length]}
            radius={[3, 3, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
