'use client';

import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';
import { useQueryStates, parseAsString, parseAsInteger } from 'nuqs';
import type { InquiryStatus } from '@prisma/client';

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'Нове',
  IN_PROGRESS: 'В роботі',
  CONVERTED: 'Конвертовано',
  ARCHIVED: 'Архів'
};

const STATUS_VARIANTS: Record<InquiryStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    NEW: 'destructive',
    IN_PROGRESS: 'default',
    CONVERTED: 'secondary',
    ARCHIVED: 'outline'
  };

export default function InquiriesPage() {
  const [params, setParams] = useQueryStates({
    status: parseAsString.withDefault(''),
    search: parseAsString.withDefault(''),
    page: parseAsInteger.withDefault(1)
  });

  const { data, isLoading } = trpc.inquiry.list.useQuery({
    status: (params.status || undefined) as InquiryStatus | undefined,
    search: params.search || undefined,
    page: params.page,
    limit: 20
  });

  return (
    <div className='p-6 max-w-6xl mx-auto space-y-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold'>Звернення</h1>
          {data && <p className='text-muted-foreground text-sm mt-1'>Всього: {data.total}</p>}
        </div>
        <Link href='/dashboard/today'>
          <Button>+ Нове звернення</Button>
        </Link>
      </div>

      {/* Фільтри */}
      <div className='flex gap-3 flex-wrap'>
        <Input
          placeholder="Пошук за ім'ям або телефоном..."
          value={params.search}
          onChange={(e) => setParams({ search: e.target.value, page: 1 })}
          className='max-w-xs'
        />
        <Select
          value={params.status || 'all'}
          onValueChange={(v) => setParams({ status: v === 'all' ? '' : v, page: 1 })}
        >
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='Статус' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Всі статуси</SelectItem>
            <SelectItem value='NEW'>Нові</SelectItem>
            <SelectItem value='IN_PROGRESS'>В роботі</SelectItem>
            <SelectItem value='CONVERTED'>Конвертовані</SelectItem>
            <SelectItem value='ARCHIVED'>Архів</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Список */}
      <div className='space-y-2'>
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-16 w-full' />)}

        {!isLoading && data?.items.length === 0 && (
          <div className='py-16 text-center text-muted-foreground'>
            <p className='text-lg'>Зверненнь не знайдено</p>
            <p className='text-sm mt-1'>Спробуйте змінити фільтри або створіть нове</p>
          </div>
        )}

        {data?.items.map((inq) => (
          <Link key={inq.id} href={`/dashboard/inquiries/${inq.id}`}>
            <div className='flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer'>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='font-medium text-sm'>
                    {inq.guest?.name ?? inq.contactName ?? inq.contactPhone ?? 'Без імені'}
                  </p>
                  <Badge variant={STATUS_VARIANTS[inq.status]}>{STATUS_LABELS[inq.status]}</Badge>
                  {inq.guest?.loyaltyTier && inq.guest.loyaltyTier !== 'NEW' && (
                    <Badge variant='outline' className='text-xs'>
                      {inq.guest.loyaltyTier}
                    </Badge>
                  )}
                </div>
                <div className='flex items-center gap-3 mt-1'>
                  <span className='text-muted-foreground text-xs'>
                    {inq.guest?.phone ?? inq.contactPhone}
                  </span>
                  {inq.property && (
                    <span className='text-muted-foreground text-xs'>{inq.property.name}</span>
                  )}
                  {inq.checkInDate && (
                    <span className='text-muted-foreground text-xs'>
                      Заїзд: {format(new Date(inq.checkInDate), 'dd.MM.yyyy', { locale: uk })}
                    </span>
                  )}
                </div>
              </div>
              <div className='flex items-center gap-3 ml-4'>
                {inq.assignedTo && (
                  <span className='text-muted-foreground text-xs hidden md:block'>
                    {inq.assignedTo.name}
                  </span>
                )}
                {inq.booking && (
                  <Badge variant='outline' className='text-xs'>
                    {inq.booking.bookingNumber}
                  </Badge>
                )}
                <span className='text-muted-foreground text-xs'>
                  {format(new Date(inq.createdAt), 'dd.MM HH:mm')}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Пагінація */}
      {data && data.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 pt-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page <= 1}
            onClick={() => setParams({ page: params.page - 1 })}
          >
            ← Попередня
          </Button>
          <span className='text-sm text-muted-foreground'>
            {params.page} / {data.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={params.page >= data.totalPages}
            onClick={() => setParams({ page: params.page + 1 })}
          >
            Наступна →
          </Button>
        </div>
      )}
    </div>
  );
}
