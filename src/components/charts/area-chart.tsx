'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AreaChartProps {
  data: Array<Record<string, string | number>>;
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  className?: string;
}

export function AreaChart({
  data,
  index,
  categories,
  colors = COLORS,
  valueFormatter,
  className
}: AreaChartProps) {
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
    <ResponsiveContainer width='100%' height={200} className={className}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='#f0f0f0' />
        <XAxis dataKey={index} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={valueFormatter}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          formatter={valueFormatter ? (v: unknown) => [valueFormatter(Number(v)), ''] : undefined}
        />
        {categories.map((cat, i) => (
          <Area
            key={cat}
            type='monotone'
            dataKey={cat}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.1}
            strokeWidth={2}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
