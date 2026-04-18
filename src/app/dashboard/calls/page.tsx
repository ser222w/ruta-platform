'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';

type Direction = 'INCOMING' | 'OUTGOING' | 'CALLBACK';
type Status = 'ACTIVE' | 'COMPLETED' | 'MISSED' | 'ABANDONED';

export default function CallsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState<Direction | ''>('');
  const [status, setStatus] = useState<Status | ''>('');
  const [hasRecording, setHasRecording] = useState<boolean | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedUtm, setExpandedUtm] = useState<string | null>(null);

  const { data: stats } = trpc.calls.stats.useQuery();

  const { data, isLoading } = trpc.calls.list.useQuery(
    {
      page,
      limit: 50,
      direction: direction || undefined,
      status: status || undefined,
      search: search || undefined,
      hasRecording: hasRecording ?? undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    },
    { placeholderData: (prev) => prev }
  );

  function resetFilters() {
    setSearch('');
    setDirection('');
    setStatus('');
    setHasRecording(null);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Дзвінки</h1>
        <p className='text-muted-foreground text-sm mt-1'>Журнал дзвінків з Ringostat</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <StatCard label='Всього' value={stats.total} />
          <StatCard label='Завершені' value={stats.completed} variant='green' />
          <StatCard label='Пропущені' value={stats.missed} variant='red' />
          <StatCard label='З записом' value={stats.withRecording} variant='blue' />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className='py-4 space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <Input
              placeholder='Пошук за номером або менеджером...'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className='w-64'
            />
            <Input
              type='date'
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className='w-36'
              title='Від'
            />
            <Input
              type='date'
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className='w-36'
              title='До'
            />
          </div>
          <div className='flex flex-wrap gap-2 items-center'>
            <span className='text-xs text-muted-foreground'>Напрямок:</span>
            {(['', 'INCOMING', 'OUTGOING', 'CALLBACK'] as const).map((d) => (
              <Button
                key={d}
                size='sm'
                variant={direction === d ? 'default' : 'outline'}
                className='text-xs h-7'
                onClick={() => {
                  setDirection(d);
                  setPage(1);
                }}
              >
                {d === '' ? 'Всі' : directionLabel(d)}
              </Button>
            ))}
            <span className='text-xs text-muted-foreground ml-2'>Статус:</span>
            {(['', 'COMPLETED', 'MISSED', 'ABANDONED'] as const).map((s) => (
              <Button
                key={s}
                size='sm'
                variant={status === s ? 'default' : 'outline'}
                className='text-xs h-7'
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s === '' ? 'Всі' : statusLabel(s)}
              </Button>
            ))}
            <span className='text-xs text-muted-foreground ml-2'>Запис:</span>
            <Button
              size='sm'
              variant={hasRecording === true ? 'default' : 'outline'}
              className='text-xs h-7'
              onClick={() => {
                setHasRecording(hasRecording === true ? null : true);
                setPage(1);
              }}
            >
              Є запис
            </Button>
            <Button
              size='sm'
              variant='ghost'
              className='text-xs h-7 ml-auto'
              onClick={resetFilters}
            >
              Скинути
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <CallsSkeleton />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center text-muted-foreground text-sm'>
            Дзвінків не знайдено
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='border-b text-muted-foreground text-xs'>
                    <th className='text-left py-3 px-3 font-medium'>Дата</th>
                    <th className='text-left py-3 px-3 font-medium'>Напрямок</th>
                    <th className='text-left py-3 px-3 font-medium'>Статус</th>
                    <th className='text-left py-3 px-3 font-medium'>Від</th>
                    <th className='text-left py-3 px-3 font-medium'>До</th>
                    <th className='text-left py-3 px-3 font-medium'>Менеджер</th>
                    <th className='text-right py-3 px-3 font-medium'>Тривалість</th>
                    <th className='text-left py-3 px-3 font-medium'>UTM</th>
                    <th className='text-left py-3 px-3 font-medium'>Запис</th>
                    <th className='text-left py-3 px-3 font-medium'>Звернення</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((call) => {
                    const hasUtm = call.utmSource || call.utmMedium || call.utmCampaign;
                    const isUtmOpen = expandedUtm === call.id;
                    return (
                      <>
                        <tr
                          key={call.id}
                          className='border-b last:border-0 hover:bg-muted/40 transition-colors'
                        >
                          <td className='py-2 px-3 text-xs text-muted-foreground whitespace-nowrap'>
                            {format(new Date(call.calledAt), 'dd.MM HH:mm', { locale: uk })}
                          </td>
                          <td className='py-2 px-3'>
                            <DirectionBadge direction={call.direction} />
                          </td>
                          <td className='py-2 px-3'>
                            <StatusBadge status={call.status} />
                          </td>
                          <td className='py-2 px-3 font-mono text-xs'>{call.callerPhone || '—'}</td>
                          <td className='py-2 px-3 font-mono text-xs'>{call.calleePhone || '—'}</td>
                          <td className='py-2 px-3 text-xs'>
                            {call.employeeName || call.managerEmail || '—'}
                          </td>
                          <td className='py-2 px-3 text-right text-xs tabular-nums'>
                            {call.duration ? formatSeconds(call.duration) : '—'}
                          </td>
                          <td className='py-2 px-3'>
                            {hasUtm ? (
                              <button
                                type='button'
                                onClick={() => setExpandedUtm(isUtmOpen ? null : call.id)}
                                className='text-xs text-blue-600 hover:underline'
                              >
                                {call.utmSource}
                                {isUtmOpen ? ' ▲' : ' ▼'}
                              </button>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
                            )}
                          </td>
                          <td className='py-2 px-3'>
                            {call.hasRecording && call.recordingUrl ? (
                              <a
                                href={call.recordingUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-xs text-blue-600 hover:underline'
                              >
                                ▶ Слухати
                              </a>
                            ) : call.hasRecording ? (
                              <span className='text-xs text-muted-foreground'>є</span>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
                            )}
                          </td>
                          <td className='py-2 px-3'>
                            {call.inquiry ? (
                              <Link
                                href={`/dashboard/inquiries/${call.inquiry.id}`}
                                className='text-xs text-blue-600 hover:underline'
                              >
                                Звернення
                              </Link>
                            ) : (
                              <span className='text-xs text-muted-foreground'>—</span>
                            )}
                          </td>
                        </tr>
                        {isUtmOpen && (
                          <tr key={`${call.id}-utm`} className='bg-muted/20 border-b'>
                            <td colSpan={10} className='px-3 py-2'>
                              <div className='flex flex-wrap gap-x-6 gap-y-1 text-xs'>
                                {call.utmSource && (
                                  <UtmCell label='source' value={call.utmSource} />
                                )}
                                {call.utmMedium && (
                                  <UtmCell label='medium' value={call.utmMedium} />
                                )}
                                {call.utmCampaign && (
                                  <UtmCell label='campaign' value={call.utmCampaign} />
                                )}
                                {call.utmContent && (
                                  <UtmCell label='content' value={call.utmContent} />
                                )}
                                {call.utmTerm && <UtmCell label='term' value={call.utmTerm} />}
                                {call.landingPage && (
                                  <UtmCell label='landing' value={call.landingPage} />
                                )}
                                {call.poolName && <UtmCell label='pool' value={call.poolName} />}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='flex items-center justify-between px-4 py-3 border-t'>
              <p className='text-sm text-muted-foreground'>
                {data.total} дзвінків · стор. {page} / {totalPages}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Назад
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Далі →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  variant
}: {
  label: string;
  value: number;
  variant?: 'green' | 'red' | 'blue';
}) {
  const color =
    variant === 'green'
      ? 'text-green-600'
      : variant === 'red'
        ? 'text-red-600'
        : variant === 'blue'
          ? 'text-blue-600'
          : '';
  return (
    <Card>
      <CardContent className='py-3 px-4'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className={`text-2xl font-semibold tabular-nums ${color}`}>
          {value.toLocaleString('uk')}
        </p>
      </CardContent>
    </Card>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === 'INCOMING')
    return <Badge className='text-xs bg-blue-100 text-blue-700 hover:bg-blue-100'>↙ Вхідний</Badge>;
  if (direction === 'OUTGOING')
    return (
      <Badge className='text-xs bg-purple-100 text-purple-700 hover:bg-purple-100'>
        ↗ Вихідний
      </Badge>
    );
  return (
    <Badge variant='secondary' className='text-xs'>
      ↩ Callback
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED')
    return (
      <Badge className='text-xs bg-green-100 text-green-700 hover:bg-green-100'>✓ Відповіли</Badge>
    );
  if (status === 'MISSED')
    return (
      <Badge variant='destructive' className='text-xs'>
        ✗ Пропущено
      </Badge>
    );
  if (status === 'ABANDONED')
    return (
      <Badge className='text-xs bg-orange-100 text-orange-700 hover:bg-orange-100'>⊘ Кинуто</Badge>
    );
  return (
    <Badge variant='secondary' className='text-xs'>
      ● Активний
    </Badge>
  );
}

function UtmCell({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className='text-muted-foreground'>{label}: </span>
      <span className='font-medium'>{value}</span>
    </span>
  );
}

function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}хв ${s}с` : `${m}хв`;
}

function directionLabel(d: Direction): string {
  return d === 'INCOMING' ? '↙ Вхідні' : d === 'OUTGOING' ? '↗ Вихідні' : '↩ Callback';
}

function statusLabel(s: Status): string {
  return s === 'COMPLETED' ? 'Відповіли' : s === 'MISSED' ? 'Пропущені' : 'Кинуто';
}

function CallsSkeleton() {
  return (
    <Card>
      <CardContent className='space-y-2 py-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </CardContent>
    </Card>
  );
}
