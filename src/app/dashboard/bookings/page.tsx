'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneLink } from '@/components/shared/phone-link';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';
import type { BookingStage } from '@prisma/client';

const STAGE_LABELS: Partial<Record<BookingStage, string>> = {
  QUALIFY: 'Кваліфікація',
  PROPOSAL_1: 'Пропозиція',
  INVOICE: 'Рахунок',
  PREPAYMENT: 'Передоплата',
  DEVELOPMENT: 'Розробка',
  CHECKIN: 'Заїзд',
  CHECKOUT: 'Виїзд',
  LOST: 'Втрачено'
};

const STAGE_VARIANT: Partial<
  Record<BookingStage, 'default' | 'secondary' | 'destructive' | 'outline'>
> = {
  PREPAYMENT: 'default',
  CHECKOUT: 'default',
  LOST: 'destructive',
  QUALIFY: 'secondary',
  INVOICE: 'outline'
};

function formatUAH(amount: number | null): string {
  if (!amount) return '—';
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0
  }).format(amount);
}

export default function BookingsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.booking.list.useQuery({
    search: search || undefined,
    page,
    limit: 20
  });

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-semibold'>Замовлення</h1>
        <p className='text-muted-foreground text-sm'>{data?.total ?? 0} всього</p>
      </div>

      {/* Search */}
      <div className='max-w-xs'>
        <Input
          placeholder='Пошук за номером або гостем…'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-14 w-full' />
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className='text-center py-16'>
          <p className='text-muted-foreground'>Замовлень не знайдено</p>
        </div>
      ) : (
        <div className='rounded-lg border overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-muted/50 border-b'>
              <tr>
                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>Номер</th>
                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>Гість</th>
                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>Готель</th>
                <th className='text-left px-4 py-3 font-medium text-muted-foreground'>Дати</th>
                <th className='text-right px-4 py-3 font-medium text-muted-foreground'>Сума</th>
                <th className='text-center px-4 py-3 font-medium text-muted-foreground'>Стадія</th>
                <th className='px-4 py-3' />
              </tr>
            </thead>
            <tbody className='divide-y'>
              {data.items.map((booking) => (
                <tr key={booking.id} className='hover:bg-muted/30 transition-colors'>
                  <td className='px-4 py-3 font-mono font-medium'>{booking.bookingNumber}</td>
                  <td className='px-4 py-3'>
                    <p className='font-medium'>{booking.guest?.name ?? '—'}</p>
                    <PhoneLink
                      phone={booking.guest?.phone}
                      className='text-muted-foreground text-xs'
                    />
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {booking.property?.name ?? '—'}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {booking.checkinDate && booking.checkoutDate ? (
                      <>
                        {format(new Date(booking.checkinDate), 'dd.MM', { locale: uk })}
                        {' – '}
                        {format(new Date(booking.checkoutDate), 'dd.MM.yy', { locale: uk })}
                        <span className='ml-1 text-xs'>({booking.nightsCount}н)</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className='px-4 py-3 text-right'>
                    {formatUAH(booking.grandTotal ? Number(booking.grandTotal) : null)}
                  </td>
                  <td className='px-4 py-3 text-center'>
                    <Badge variant={STAGE_VARIANT[booking.stage] ?? 'secondary'}>
                      {STAGE_LABELS[booking.stage] ?? booking.stage}
                    </Badge>
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button variant='ghost' size='sm'>
                        →
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-sm'>
            Сторінка {page} з {data.totalPages}
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={page === data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
