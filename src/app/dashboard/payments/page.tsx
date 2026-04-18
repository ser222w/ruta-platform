'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PhoneLink } from '@/components/shared/phone-link';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PaymentsPage() {
  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Payments</h1>
        <p className='text-muted-foreground text-sm mt-1'>
          Графік платежів · оновлюється при refresh
        </p>
      </div>

      <Tabs defaultValue='overdue'>
        <TabsList>
          <TabsTrigger value='overdue'>Прострочені</TabsTrigger>
          <TabsTrigger value='upcoming'>Очікуються</TabsTrigger>
          <TabsTrigger value='all'>Всі</TabsTrigger>
        </TabsList>

        <TabsContent value='overdue' className='mt-4'>
          <OverdueTab />
        </TabsContent>

        <TabsContent value='upcoming' className='mt-4'>
          <UpcomingTab />
        </TabsContent>

        <TabsContent value='all' className='mt-4'>
          <AllTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Overdue Tab ────────────────────────────────────────────────────

function OverdueTab() {
  const { data: lines, isLoading } = trpc.dashboard.overduePayments.useQuery();

  if (isLoading) return <PaymentSkeleton />;

  if (!lines || lines.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground text-sm'>
          Прострочених платежів немає
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-muted-foreground'>
                <th className='text-left py-3 px-4 font-medium'>Прострочено</th>
                <th className='text-left py-3 px-4 font-medium'>Дедлайн</th>
                <th className='text-left py-3 px-4 font-medium'>Бронювання</th>
                <th className='text-left py-3 px-4 font-medium'>Гість</th>
                <th className='text-left py-3 px-4 font-medium'>Менеджер</th>
                <th className='text-right py-3 px-4 font-medium'>Сума</th>
                <th className='py-3 px-4'></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className='border-b last:border-0 hover:bg-muted/40 transition-colors'
                >
                  <td className='py-3 px-4'>
                    <Badge variant='destructive' className='text-xs'>
                      {line.overdueDays} дн
                    </Badge>
                  </td>
                  <td className='py-3 px-4 text-muted-foreground text-xs'>
                    {line.dueDate
                      ? format(new Date(line.dueDate), 'dd.MM.yyyy', { locale: uk })
                      : '—'}
                  </td>
                  <td className='py-3 px-4'>
                    {line.booking ? (
                      <Link
                        href={`/dashboard/bookings/${line.booking.id}`}
                        className='font-medium hover:underline text-blue-600'
                      >
                        {line.booking.bookingNumber}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className='py-3 px-4'>
                    <div>
                      <p className='font-medium'>{line.booking?.guest?.name ?? '—'}</p>
                      <PhoneLink
                        phone={line.booking?.guest?.phone}
                        className='text-muted-foreground text-xs'
                      />
                    </div>
                  </td>
                  <td className='py-3 px-4 text-muted-foreground'>
                    {line.booking?.closer?.name ?? '—'}
                  </td>
                  <td className='py-3 px-4 text-right font-medium'>
                    {formatCurrency(line.amount)}
                  </td>
                  <td className='py-3 px-4'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-xs'
                      onClick={() => toast.info('Нагадування — буде реалізовано в Chat C (Inbox)')}
                    >
                      💬 Нагадати
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Upcoming Tab ───────────────────────────────────────────────────

function UpcomingTab() {
  const { data: lines, isLoading } = trpc.dashboard.upcomingPayments.useQuery();

  if (isLoading) return <PaymentSkeleton />;

  if (!lines || lines.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground text-sm'>
          Очікуваних платежів на найближчі 30 днів немає
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-muted-foreground'>
                <th className='text-left py-3 px-4 font-medium'>Дедлайн</th>
                <th className='text-left py-3 px-4 font-medium'>Бронювання</th>
                <th className='text-left py-3 px-4 font-medium'>Гість</th>
                <th className='text-left py-3 px-4 font-medium'>Призначення</th>
                <th className='text-right py-3 px-4 font-medium'>Сума</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className='border-b last:border-0 hover:bg-muted/40 transition-colors'
                >
                  <td className='py-3 px-4 font-medium'>
                    {line.dueDate
                      ? format(new Date(line.dueDate), 'dd.MM.yyyy', { locale: uk })
                      : '—'}
                  </td>
                  <td className='py-3 px-4'>
                    {line.booking ? (
                      <Link
                        href={`/dashboard/bookings/${line.booking.id}`}
                        className='font-medium hover:underline text-blue-600'
                      >
                        {line.booking.bookingNumber}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className='py-3 px-4'>
                    <p className='font-medium'>{line.booking?.guest?.name ?? '—'}</p>
                  </td>
                  <td className='py-3 px-4 text-muted-foreground'>{line.label ?? '—'}</td>
                  <td className='py-3 px-4 text-right font-medium'>
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── All Payments Tab ───────────────────────────────────────────────

function AllTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.dashboard.allPayments.useQuery({ page, limit: 20 });

  if (isLoading) return <PaymentSkeleton />;

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardContent className='py-12 text-center text-muted-foreground text-sm'>
          Платежів немає
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(data.total / 20);

  return (
    <Card>
      <CardContent className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b text-muted-foreground'>
                <th className='text-left py-3 px-4 font-medium'>Статус</th>
                <th className='text-left py-3 px-4 font-medium'>Дата</th>
                <th className='text-left py-3 px-4 font-medium'>Бронювання</th>
                <th className='text-left py-3 px-4 font-medium'>Гість</th>
                <th className='text-left py-3 px-4 font-medium'>Призначення</th>
                <th className='text-right py-3 px-4 font-medium'>Сума</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((line) => (
                <tr
                  key={line.id}
                  className='border-b last:border-0 hover:bg-muted/40 transition-colors'
                >
                  <td className='py-3 px-4'>
                    <StatusBadge
                      status={line.status}
                      paidAt={line.paidAt ? new Date(line.paidAt) : null}
                      dueDate={line.dueDate ? new Date(line.dueDate) : null}
                    />
                  </td>
                  <td className='py-3 px-4 text-muted-foreground text-xs'>
                    {(line.paidAt ?? line.dueDate)
                      ? format(new Date((line.paidAt ?? line.dueDate)!), 'dd.MM.yyyy', {
                          locale: uk
                        })
                      : '—'}
                  </td>
                  <td className='py-3 px-4'>
                    {line.booking ? (
                      <Link
                        href={`/dashboard/bookings/${line.booking.id}`}
                        className='font-medium hover:underline text-blue-600'
                      >
                        {line.booking.bookingNumber}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className='py-3 px-4'>{line.booking?.guest?.name ?? '—'}</td>
                  <td className='py-3 px-4 text-muted-foreground'>{line.label ?? '—'}</td>
                  <td className='py-3 px-4 text-right font-medium'>
                    {formatCurrency(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className='flex items-center justify-between p-4 border-t'>
            <p className='text-sm text-muted-foreground'>Всього: {data.total} платежів</p>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Назад
              </Button>
              <span className='text-sm py-1 px-2'>
                {page} / {totalPages}
              </span>
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
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function StatusBadge({
  status,
  paidAt,
  dueDate
}: {
  status: string;
  paidAt: Date | null | undefined;
  dueDate: Date | null | undefined;
}) {
  if (status === 'paid' || paidAt) {
    return (
      <Badge className='text-xs bg-green-100 text-green-700 hover:bg-green-100'>Оплачено</Badge>
    );
  }
  if (dueDate && new Date(dueDate) < new Date()) {
    return (
      <Badge variant='destructive' className='text-xs'>
        Прострочено
      </Badge>
    );
  }
  return (
    <Badge variant='secondary' className='text-xs'>
      Очікується
    </Badge>
  );
}

function PaymentSkeleton() {
  return (
    <Card>
      <CardContent className='space-y-2 py-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className='h-12 w-full' />
        ))}
      </CardContent>
    </Card>
  );
}
