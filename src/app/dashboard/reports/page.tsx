'use client';

import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, DonutChart } from '@/components/charts';

export default function ReportsPage() {
  const { data: funnel, isLoading: funnelLoading } = trpc.dashboard.monthlyFunnel.useQuery();
  const { data: lossReasons, isLoading: lossLoading } = trpc.dashboard.lossReasons.useQuery();

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Reports</h1>
        <p className='text-muted-foreground text-sm mt-1'>Конверсія · 6 місяців</p>
      </div>

      {/* Funnel Chart + Loss Reasons */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Monthly Funnel Bar Chart */}
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Воронка по місяцях</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <Skeleton className='h-[220px] w-full' />
            ) : (
              <BarChart
                data={funnel ?? []}
                index='month'
                categories={['Звернення', 'Пропозиція', 'Передоплата', 'Заїзд']}
                colors={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']}
              />
            )}
          </CardContent>
        </Card>

        {/* Loss Reasons Donut */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Причини відмов</CardTitle>
          </CardHeader>
          <CardContent>
            {lossLoading ? (
              <Skeleton className='h-[200px] w-full' />
            ) : !lossReasons || lossReasons.length === 0 ? (
              <div className='flex items-center justify-center h-[200px] text-muted-foreground text-sm'>
                Відмов за 6 місяців немає
              </div>
            ) : (
              <DonutChart
                data={lossReasons.map((r) => ({
                  name: LOSS_LABELS[r.name] ?? r.name,
                  value: r.value
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stage Timing Table */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Поточна воронка (місяць)</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelTable />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Funnel table ────────────────────────────────────────────────────

function FunnelTable() {
  const { data: funnel, isLoading } = trpc.dashboard.conversionFunnel.useQuery();

  if (isLoading) return <Skeleton className='h-40 w-full' />;

  if (!funnel || funnel.length === 0) {
    return <p className='text-muted-foreground text-sm py-4 text-center'>Немає даних</p>;
  }

  return (
    <div className='space-y-3'>
      {funnel.map((stage, i) => {
        const prevCount = i > 0 ? funnel[i - 1]!.count : stage.count;
        const convRate = i > 0 && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;

        return (
          <div key={stage.stage}>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-sm font-medium'>{stage.stage}</span>
              <span className='text-sm font-semibold'>{stage.count}</span>
            </div>
            <div className='h-2 bg-muted rounded-full overflow-hidden'>
              <div
                className='h-full bg-blue-500 rounded-full transition-all'
                style={{ width: `${stage.pct}%` }}
              />
            </div>
            {i > 0 && (
              <p className='text-xs text-muted-foreground mt-1 text-right'>
                ↓ {convRate}% конверсія з попереднього
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Labels map ─────────────────────────────────────────────────────

const LOSS_LABELS: Record<string, string> = {
  PRICE: 'Ціна',
  DATES: 'Дати',
  NO_RESPONSE: 'Не відповів',
  COMPETITOR: 'Конкурент',
  OTHER: 'Інше'
};
