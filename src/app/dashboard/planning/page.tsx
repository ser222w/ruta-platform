'use client';

import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard, AreaChart, DonutChart } from '@/components/charts';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function PlanningPage() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.planningKpis.useQuery();
  const { data: trend, isLoading: trendLoading } = trpc.dashboard.revenueTrend.useQuery();
  const { data: channels, isLoading: channelsLoading } = trpc.dashboard.channelMix.useQuery();
  const { data: managers, isLoading: managersLoading } = trpc.dashboard.managerStats.useQuery();

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-semibold'>Planning</h1>
        <p className='text-muted-foreground text-sm mt-1'>
          KPI поточного місяця · оновлюється при refresh
        </p>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-2 lg:grid-cols-5 gap-4'>
        {kpisLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)
        ) : (
          <>
            <MetricCard
              data-testid='kpi-revenue'
              title='Revenue'
              value={formatCurrency(kpis?.revenue ?? 0)}
            />
            <MetricCard data-testid='kpi-adr' title='ADR' value={formatCurrency(kpis?.adr ?? 0)} />
            <MetricCard
              data-testid='kpi-revpar'
              title='RevPAR'
              value={formatCurrency(kpis?.revpar ?? 0)}
            />
            <MetricCard
              data-testid='kpi-occupancy'
              title='Occupancy'
              value={formatPercent(kpis?.occupancy ?? 0)}
            />
            <MetricCard title='ALOS' value={`${(kpis?.alos ?? 0).toFixed(1)} н`} />
          </>
        )}
      </div>

      {/* Revenue Trend + Channel Mix */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Revenue Trend */}
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Revenue — 12 місяців</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className='h-[200px] w-full' />
            ) : (
              <AreaChart
                data={trend ?? []}
                index='month'
                categories={['Revenue']}
                valueFormatter={(v) => `₴${Math.round(v / 1000)}k`}
              />
            )}
          </CardContent>
        </Card>

        {/* Channel Mix */}
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base'>Channel mix</CardTitle>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <Skeleton className='h-[200px] w-full' />
            ) : (
              <DonutChart data={channels ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manager Performance Table */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>Менеджери — поточний місяць</CardTitle>
        </CardHeader>
        <CardContent>
          {managersLoading ? (
            <div className='space-y-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : !managers || managers.length === 0 ? (
            <p className='text-muted-foreground text-sm py-6 text-center'>
              Немає даних по менеджерам
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-muted-foreground'>
                    <th className='text-left py-2 pr-4 font-medium'>Менеджер</th>
                    <th className='text-right py-2 px-4 font-medium'>Звернень</th>
                    <th className='text-right py-2 px-4 font-medium'>Пропозицій</th>
                    <th className='text-right py-2 px-4 font-medium'>Оплат</th>
                    <th className='text-right py-2 px-4 font-medium'>Конверсія</th>
                    <th className='text-right py-2 pl-4 font-medium'>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((m) => (
                    <tr
                      key={m.id}
                      className='border-b last:border-0 hover:bg-muted/40 transition-colors'
                    >
                      <td className='py-3 pr-4 font-medium'>{m.name}</td>
                      <td className='text-right py-3 px-4 text-muted-foreground'>{m.total}</td>
                      <td className='text-right py-3 px-4 text-muted-foreground'>{m.proposals}</td>
                      <td className='text-right py-3 px-4 text-muted-foreground'>{m.paid}</td>
                      <td className='text-right py-3 px-4'>
                        <Badge
                          variant={m.conversion >= 30 ? 'default' : 'secondary'}
                          className='text-xs'
                        >
                          {formatPercent(m.conversion)}
                        </Badge>
                      </td>
                      <td className='text-right py-3 pl-4 font-medium'>
                        {formatCurrency(m.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
