'use client';

import { useState, useCallback } from 'react';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay
} from '@/components/ui/kanban';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { trpc } from '@/lib/trpc';
import { BookingCard, type BookingCardData } from '@/components/crm/booking-card';
import { BookingDetailSheet } from '@/components/crm/booking-detail-sheet';
import { PIPELINE_COLUMNS } from '@/components/crm/pipeline-constants';
import type { BookingStage } from '@prisma/client';
import type { UniqueIdentifier } from '@dnd-kit/core';

export default function CrmPage() {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.crm.pipeline.useQuery({});
  const updateStage = trpc.crm.updateStage.useMutation({
    onSuccess: () => refetch()
  });

  // Формуємо структуру для Kanban — тільки активні колонки
  const columns = PIPELINE_COLUMNS.reduce<Record<UniqueIdentifier, BookingCardData[]>>(
    (acc, col) => {
      acc[col.stage] = (data?.grouped[col.stage] ?? []) as BookingCardData[];
      return acc;
    },
    {}
  );

  const handleDragEnd = useCallback(
    (newColumns: Record<UniqueIdentifier, BookingCardData[]>) => {
      // Знаходимо яка карточка перемістилась в яку колонку
      for (const [stage, items] of Object.entries(newColumns)) {
        for (const item of items) {
          if (item.stage !== stage) {
            updateStage.mutate({ id: item.id, stage: stage as BookingStage });
          }
        }
      }
    },
    [updateStage]
  );

  return (
    <div className='flex flex-col h-full'>
      {/* Заголовок */}
      <div className='flex items-center justify-between px-6 py-4 border-b shrink-0'>
        <div>
          <h1 className='text-xl font-semibold'>CRM Pipeline</h1>
          {data && <p className='text-sm text-muted-foreground mt-0.5'>{data.total} бронювань</p>}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setView('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'table' ? 'default' : 'outline'}
            size='sm'
            onClick={() => setView('table')}
          >
            Таблиця
          </Button>
        </div>
      </div>

      {/* Контент */}
      <div className='flex-1 overflow-hidden'>
        {isLoading ? (
          <KanbanSkeleton />
        ) : view === 'kanban' ? (
          <ScrollArea className='h-full w-full'>
            <div className='p-4 h-full'>
              <Kanban<BookingCardData>
                value={columns}
                onValueChange={handleDragEnd}
                getItemValue={(item) => item.id}
              >
                <KanbanBoard className='h-full min-h-[calc(100vh-10rem)] items-start'>
                  {PIPELINE_COLUMNS.map((col) => {
                    const items = columns[col.stage] ?? [];
                    return (
                      <KanbanColumn
                        key={col.stage}
                        value={col.stage}
                        className={`w-64 shrink-0 ${col.color}`}
                      >
                        {/* Заголовок колонки */}
                        <div className='flex items-center justify-between px-1 py-0.5'>
                          <span className='text-xs font-semibold'>{col.label}</span>
                          <Badge variant='secondary' className='text-xs h-5 px-1.5'>
                            {items.length}
                          </Badge>
                        </div>

                        {/* Карточки */}
                        {items.map((booking) => (
                          <KanbanItem key={booking.id} value={booking.id} asHandle>
                            <BookingCard
                              booking={booking}
                              onClick={() => setSelectedId(booking.id)}
                            />
                          </KanbanItem>
                        ))}

                        {items.length === 0 && (
                          <div className='flex-1 flex items-center justify-center py-8'>
                            <p className='text-xs text-muted-foreground'>Порожньо</p>
                          </div>
                        )}
                      </KanbanColumn>
                    );
                  })}
                </KanbanBoard>

                <KanbanOverlay>
                  {({ value }) => {
                    const item = Object.values(columns)
                      .flat()
                      .find((b) => b.id === value);
                    return item ? <BookingCard booking={item} isDragging /> : null;
                  }}
                </KanbanOverlay>
              </Kanban>
            </div>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        ) : (
          <TableView onSelectBooking={setSelectedId} />
        )}
      </div>

      {/* Detail slide-over */}
      <BookingDetailSheet bookingId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

// ============================================================
// Table view
// ============================================================

function TableView({ onSelectBooking }: { onSelectBooking: (id: string) => void }) {
  const { data, isLoading } = trpc.crm.list.useQuery({ page: 1, limit: 50 });

  if (isLoading) {
    return (
      <div className='p-6 space-y-2'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className='h-10 w-full' />
        ))}
      </div>
    );
  }

  const bookings = data?.items ?? [];

  if (bookings.length === 0) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-muted-foreground'>Бронювань не знайдено</p>
      </div>
    );
  }

  return (
    <div className='overflow-auto h-full'>
      <table className='w-full text-sm'>
        <thead className='border-b bg-muted/50 sticky top-0'>
          <tr>
            <th className='text-left px-4 py-2 font-medium text-muted-foreground'>№</th>
            <th className='text-left px-4 py-2 font-medium text-muted-foreground'>Гість</th>
            <th className='text-left px-4 py-2 font-medium text-muted-foreground'>Готель</th>
            <th className='text-left px-4 py-2 font-medium text-muted-foreground'>Заїзд</th>
            <th className='text-left px-4 py-2 font-medium text-muted-foreground'>Стадія</th>
            <th className='text-right px-4 py-2 font-medium text-muted-foreground'>Сума</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr
              key={b.id}
              className='border-b hover:bg-muted/30 cursor-pointer transition-colors'
              onClick={() => onSelectBooking(b.id)}
            >
              <td className='px-4 py-2 font-mono text-xs text-muted-foreground'>
                {b.bookingNumber}
              </td>
              <td className='px-4 py-2 font-medium'>{b.guest?.name ?? '—'}</td>
              <td className='px-4 py-2 text-muted-foreground'>
                {b.property.name.split(' ').slice(-1)[0]}
              </td>
              <td className='px-4 py-2 text-muted-foreground'>
                {b.checkinDate
                  ? new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short' }).format(
                      new Date(b.checkinDate)
                    )
                  : '—'}
              </td>
              <td className='px-4 py-2'>
                <Badge variant='outline' className='text-xs'>
                  {b.stage}
                </Badge>
              </td>
              <td className='px-4 py-2 text-right font-semibold'>
                {new Intl.NumberFormat('uk-UA', {
                  style: 'currency',
                  currency: 'UAH',
                  maximumFractionDigits: 0
                }).format(parseFloat(String(b.grandTotal)))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Skeleton
// ============================================================

function KanbanSkeleton() {
  return (
    <div className='flex gap-4 p-4 overflow-hidden'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='w-64 shrink-0 space-y-2'>
          <Skeleton className='h-6 w-24' />
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className='h-24 w-full' />
          ))}
        </div>
      ))}
    </div>
  );
}
