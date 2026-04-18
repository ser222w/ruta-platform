'use client';

import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneLink } from '@/components/shared/phone-link';
import { ChannelBadge } from './channel-badge';
import { format, formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import Link from 'next/link';

// Maps loyalty tier to Ukrainian label
const TIER_LABELS: Record<string, string> = {
  NEW: 'Новий',
  FRIEND: 'Друг',
  FAMILY: 'Родина',
  VIP: 'VIP'
};

interface ConversationContextProps {
  conversationId: string;
}

export function ConversationContext({ conversationId }: ConversationContextProps) {
  const { data, isLoading } = trpc.inbox.getConversation.useQuery({ id: conversationId });

  if (isLoading) {
    return (
      <div className='space-y-3 p-4'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-4 w-1/2' />
        <Skeleton className='h-4 w-2/3' />
      </div>
    );
  }

  if (!data) return null;

  const guest = data.inquiries[0]?.guest;
  const inquiry = data.inquiries[0];

  return (
    <ScrollArea className='h-full'>
      <div className='space-y-4 p-4'>
        {/* Channel info */}
        <div>
          <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider'>
            Канал
          </p>
          <div className='flex items-center gap-2'>
            <ChannelBadge channel={data.channel} />
            <span className='text-muted-foreground text-xs'>{data.inbox.name}</span>
          </div>
          {data.inbox.brand && (
            <p className='text-muted-foreground mt-0.5 text-xs'>{data.inbox.brand.name}</p>
          )}
        </div>

        {/* Guest info */}
        {guest ? (
          <div>
            <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider'>
              Гість
            </p>
            <p className='font-medium'>{guest.name}</p>
            <PhoneLink phone={guest.phone} className='text-muted-foreground text-sm' />
            {guest.email && <p className='text-muted-foreground text-sm'>{guest.email}</p>}
            <div className='mt-2 flex flex-wrap gap-1.5'>
              <Badge variant='outline' className='text-[10px]'>
                {TIER_LABELS[guest.loyaltyTier] ?? guest.loyaltyTier}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                {guest.visitsCount} заїздів
              </Badge>
              {Number(guest.totalRevenue) > 0 && (
                <Badge variant='outline' className='text-[10px]'>
                  ₴{Number(guest.totalRevenue).toLocaleString('uk-UA')}
                </Badge>
              )}
            </div>
            <Link href={`/dashboard/crm?guest=${guest.id}`}>
              <Button variant='outline' size='sm' className='mt-3 w-full text-xs'>
                Профіль гостя →
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider'>
              Гість
            </p>
            <p className='text-muted-foreground text-sm'>Не ідентифікований</p>
          </div>
        )}

        {/* Linked booking */}
        {data.booking && (
          <div>
            <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider'>
              Бронювання
            </p>
            <div className='rounded-md border p-2.5'>
              <p className='text-sm font-medium'>#{data.booking.bookingNumber}</p>
              <p className='text-muted-foreground text-xs'>
                {data.booking.checkinDate
                  ? format(new Date(data.booking.checkinDate), 'd MMM', { locale: uk })
                  : ''}
                {' – '}
                {data.booking.checkoutDate
                  ? format(new Date(data.booking.checkoutDate), 'd MMM yyyy', { locale: uk })
                  : ''}
              </p>
              <Badge variant='secondary' className='mt-1 text-[10px]'>
                {(data.booking as { stage?: string }).stage ?? ''}
              </Badge>
              <Link href={`/dashboard/bookings/${data.booking.id}`}>
                <Button variant='outline' size='sm' className='mt-2 w-full text-xs'>
                  Відкрити →
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <p className='text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider'>
            Дії
          </p>
          <div className='space-y-1.5'>
            <Button variant='outline' size='sm' className='w-full justify-start text-xs'>
              + Створити бронювання
            </Button>
            <Button variant='outline' size='sm' className='w-full justify-start text-xs'>
              + Зв'язати з бронюванням
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className='text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider'>
            Теги
          </p>
          <div className='flex flex-wrap gap-1'>
            <button className='text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2 py-0.5'>
              + Тег
            </button>
          </div>
        </div>

        {/* Previous conversations */}
        {guest && <PreviousConversations guestId={guest.id} excludeId={conversationId} />}
      </div>
    </ScrollArea>
  );
}

function PreviousConversations({ guestId, excludeId }: { guestId: string; excludeId: string }) {
  const { data: history = [] } = trpc.inbox.getGuestHistory.useQuery({
    guestId,
    excludeConversationId: excludeId
  });

  if (history.length === 0) return null;

  return (
    <div>
      <p className='text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider'>
        Попередні діалоги
      </p>
      <div className='space-y-1.5'>
        {history.map((c) => (
          <div
            key={c.id}
            className='flex items-start justify-between gap-2 rounded p-2 hover:bg-muted transition-colors cursor-pointer text-xs'
          >
            <div className='min-w-0'>
              <span className='font-medium block truncate'>
                {(c.inbox as { name?: string })?.name ?? c.channel}
              </span>
              {c.messages[0] && (
                <p className='text-muted-foreground truncate max-w-[150px]'>
                  {c.messages[0].content}
                </p>
              )}
            </div>
            <span className='text-muted-foreground flex-shrink-0'>
              {c.lastMessageAt
                ? formatDistanceToNow(new Date(c.lastMessageAt), { addSuffix: true, locale: uk })
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
