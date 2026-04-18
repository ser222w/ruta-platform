'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneLink } from '@/components/shared/phone-link';
import { trpc } from '@/lib/trpc';
import { STAGE_LABELS, STAGE_BADGE_VARIANT } from './pipeline-constants';
import type { BookingStage } from '@prisma/client';

interface BookingDetailSheetProps {
  bookingId: string | null;
  onClose: () => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0
  }).format(num);
}

export function BookingDetailSheet({ bookingId, onClose }: BookingDetailSheetProps) {
  const [note, setNote] = useState('');
  const utils = trpc.useUtils();

  const { data: booking, isLoading } = trpc.crm.getById.useQuery(
    { id: bookingId! },
    { enabled: !!bookingId }
  );

  const updateStage = trpc.crm.updateStage.useMutation({
    onSuccess: () => utils.crm.pipeline.invalidate()
  });

  const addNote = trpc.crm.addNote.useMutation({
    onSuccess: () => {
      setNote('');
      utils.crm.getById.invalidate({ id: bookingId! });
    }
  });

  const handleAddNote = () => {
    if (!note.trim() || !bookingId) return;
    addNote.mutate({ id: bookingId, body: note.trim() });
  };

  return (
    <Sheet open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className='w-full sm:max-w-xl overflow-y-auto'>
        {isLoading || !booking ? (
          <div className='space-y-4 p-1'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-24 w-full' />
          </div>
        ) : (
          <>
            <SheetHeader className='pr-6'>
              <div className='flex items-center gap-2 flex-wrap'>
                <SheetTitle className='font-mono text-base'>{booking.bookingNumber}</SheetTitle>
                <Badge variant={STAGE_BADGE_VARIANT[booking.stage]}>
                  {STAGE_LABELS[booking.stage]}
                </Badge>
              </div>
            </SheetHeader>

            <div className='mt-6 space-y-6'>
              {/* Гість */}
              <section>
                <h3 className='text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide'>
                  Гість
                </h3>
                {booking.guest ? (
                  <div className='space-y-1'>
                    <p className='font-medium'>{booking.guest.name}</p>
                    <PhoneLink
                      phone={booking.guest.phone}
                      className='text-sm text-muted-foreground'
                    />
                    {booking.guest.email && (
                      <p className='text-sm text-muted-foreground'>{booking.guest.email}</p>
                    )}
                    <Badge variant='outline' className='text-xs'>
                      {booking.guest.loyaltyTier}
                    </Badge>
                  </div>
                ) : (
                  <p className='text-sm text-muted-foreground'>Гість не прив'язаний</p>
                )}
              </section>

              <Separator />

              {/* Деталі бронювання */}
              <section>
                <h3 className='text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide'>
                  Бронювання
                </h3>
                <div className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
                  <div>
                    <p className='text-muted-foreground'>Готель</p>
                    <p className='font-medium'>{booking.property.name}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Дати</p>
                    <p className='font-medium'>
                      {formatDate(booking.checkinDate)} – {formatDate(booking.checkoutDate)}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Гостей</p>
                    <p className='font-medium'>
                      {booking.adultsCount} дор.
                      {booking.childrenCount > 0 ? ` + ${booking.childrenCount} діт.` : ''}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Сума</p>
                    <p className='font-semibold'>{formatCurrency(booking.grandTotal)}</p>
                  </div>
                  {booking.closer && (
                    <div>
                      <p className='text-muted-foreground'>Closer</p>
                      <p className='font-medium'>{booking.closer.name}</p>
                    </div>
                  )}
                  {booking.farmer && (
                    <div>
                      <p className='text-muted-foreground'>Farmer</p>
                      <p className='font-medium'>{booking.farmer.name}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Номери */}
              {booking.roomLines.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h3 className='text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide'>
                      Номери
                    </h3>
                    <div className='space-y-2'>
                      {booking.roomLines.map((line) => (
                        <div key={line.id} className='flex items-center justify-between text-sm'>
                          <span>
                            {line.roomCategory.name} × {line.roomsCount}
                          </span>
                          <span className='text-muted-foreground'>
                            {formatCurrency(line.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              <Separator />

              {/* Зміна стадії */}
              <section>
                <h3 className='text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide'>
                  Швидкі дії
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {getNextStages(booking.stage).map((stage) => (
                    <Button
                      key={stage}
                      variant='outline'
                      size='sm'
                      disabled={updateStage.isPending}
                      onClick={() => updateStage.mutate({ id: booking.id, stage })}
                    >
                      → {STAGE_LABELS[stage]}
                    </Button>
                  ))}
                </div>
              </section>

              <Separator />

              {/* Нотатка */}
              <section>
                <h3 className='text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide'>
                  Додати нотатку
                </h3>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder='Нотатка по бронюванню...'
                  rows={3}
                  className='resize-none'
                />
                <Button
                  size='sm'
                  className='mt-2'
                  disabled={!note.trim() || addNote.isPending}
                  onClick={handleAddNote}
                >
                  {addNote.isPending ? 'Зберігаю...' : 'Зберегти нотатку'}
                </Button>
              </section>

              {/* Таймлайн активностей */}
              {booking.activities.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h3 className='text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide'>
                      Таймлайн
                    </h3>
                    <ol className='space-y-3'>
                      {booking.activities.map((act) => (
                        <li key={act.id} className='flex gap-3 text-sm'>
                          <div className='w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0' />
                          <div>
                            <p className='font-medium leading-snug'>{act.title}</p>
                            {act.body && (
                              <p className='text-muted-foreground text-xs mt-0.5'>{act.body}</p>
                            )}
                            <p className='text-xs text-muted-foreground mt-1'>
                              {act.user?.name ?? 'Система'} · {formatDate(act.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Логіка наступних стадій (лінійний happy path)
function getNextStages(current: BookingStage): BookingStage[] {
  const transitions: Partial<Record<BookingStage, BookingStage[]>> = {
    QUALIFY: ['PROPOSAL_1', 'LOST'],
    PROPOSAL_1: ['PROPOSAL_2', 'INVOICE', 'REFUSAL_1'],
    REFUSAL_1: ['PROPOSAL_2', 'LOST'],
    PROPOSAL_2: ['PROPOSAL_3', 'INVOICE', 'REFUSAL_2'],
    REFUSAL_2: ['PROPOSAL_3', 'LOST'],
    PROPOSAL_3: ['INVOICE', 'REFUSAL_3'],
    REFUSAL_3: ['PROPOSAL_4', 'LOST'],
    PROPOSAL_4: ['INVOICE', 'LOST'],
    INVOICE: ['PREPAYMENT', 'LOST'],
    PREPAYMENT: ['DEVELOPMENT', 'CHECKIN'],
    DEVELOPMENT: ['CHECKIN'],
    CHECKIN: ['CHECKOUT'],
    CHECKOUT: [],
    LOST: ['QUALIFY']
  };
  return transitions[current] ?? [];
}
