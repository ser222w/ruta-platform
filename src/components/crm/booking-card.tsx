'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, STAGE_BADGE_VARIANT } from './pipeline-constants';
import type { BookingStage } from '@prisma/client';

// Мінімальний тип для відображення карточки
export interface BookingCardData {
  id: string;
  bookingNumber: string;
  stage: BookingStage;
  checkinDate: Date | null;
  checkoutDate: Date | null;
  nightsCount: number;
  adultsCount: number;
  grandTotal: string | number;
  paymentStatus: string;
  guest: { id: string; name: string; phone: string | null } | null;
  closer: { id: string; name: string } | null;
  property: { name: string; slug: string };
}

interface BookingCardProps {
  booking: BookingCardData;
  onClick?: () => void;
  isDragging?: boolean;
  className?: string;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: 'short' }).format(
    new Date(date)
  );
}

function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    maximumFractionDigits: 0
  }).format(num);
}

export function BookingCard({ booking, onClick, isDragging, className }: BookingCardProps) {
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className={cn(
        'bg-background rounded-md border p-3 text-sm shadow-xs transition-shadow',
        'hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isDragging && 'opacity-50',
        className
      )}
    >
      {/* Верхній рядок: номер + статус */}
      <div className='flex items-center justify-between gap-2 mb-2'>
        <span className='font-mono text-xs text-muted-foreground'>{booking.bookingNumber}</span>
        <Badge variant={STAGE_BADGE_VARIANT[booking.stage]} className='text-xs'>
          {STAGE_LABELS[booking.stage]}
        </Badge>
      </div>

      {/* Ім'я гостя */}
      <p className='font-medium leading-snug truncate'>
        {booking.guest?.name ?? 'Гість не вказаний'}
      </p>

      {/* Телефон */}
      {booking.guest?.phone && (
        <p className='text-xs text-muted-foreground mt-0.5'>{booking.guest.phone}</p>
      )}

      {/* Дати + ночі */}
      {(booking.checkinDate || booking.checkoutDate) && (
        <p className='text-xs text-muted-foreground mt-2'>
          {formatDate(booking.checkinDate)} – {formatDate(booking.checkoutDate)}
          {booking.nightsCount > 0 && <span className='ml-1'>· {booking.nightsCount} н.</span>}
        </p>
      )}

      {/* Нижній рядок: сума + готель */}
      <div className='flex items-center justify-between mt-2 pt-2 border-t'>
        <span className='text-xs text-muted-foreground'>
          {booking.property.name.split(' ').slice(-1)[0]}
        </span>
        <span className='font-semibold text-sm'>{formatCurrency(booking.grandTotal)}</span>
      </div>
    </div>
  );
}
