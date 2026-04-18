'use client';

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChannelBadge } from './channel-badge';
import { UnansweredTimer } from './unanswered-timer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface GuestInfo {
  name: string;
  phone?: string | null;
  telegramChatId?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConversation = any;

interface ConversationListProps {
  conversations: AnyConversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  // guestId → GuestInfo
  guests?: Record<string, GuestInfo>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getTelegramAvatarUrl(telegramChatId: string | null | undefined): string | undefined {
  // Telegram doesn't expose avatars without Bot API getChat call — leave for future
  // When we have it stored on GuestProfile, we'd return it here
  void telegramChatId;
  return undefined;
}

function getDisplayName(conv: AnyConversation, guest: GuestInfo | undefined): string {
  if (guest?.name && guest.name !== 'Невідомий гість') return guest.name;
  if (guest?.phone) return guest.phone;
  if (conv.externalThreadId) return conv.externalThreadId;
  return 'Гість';
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  guests = {}
}: ConversationListProps) {
  const { unanswered, rest } = useMemo(() => {
    const u: AnyConversation[] = [];
    const r: AnyConversation[] = [];
    for (const c of conversations) {
      if (c.unreadByManager && c.status === 'OPEN') {
        u.push(c);
      } else {
        r.push(c);
      }
    }
    return { unanswered: u, rest: r };
  }, [conversations]);

  return (
    <ScrollArea className='h-full'>
      <div className='flex flex-col'>
        {conversations.length === 0 && (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Нових звернень немає
          </div>
        )}
        {unanswered.length > 0 && (
          <>
            <div className='flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400'>
              <span className='h-1.5 w-1.5 rounded-full bg-red-500' />
              Без відповіді · {unanswered.length}
            </div>
            {unanswered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={conv.id === selectedId}
                guests={guests}
                onSelect={onSelect}
                showTimer
              />
            ))}
            {rest.length > 0 && (
              <div className='mt-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Решта · {rest.length}
              </div>
            )}
          </>
        )}
        {rest.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            isSelected={conv.id === selectedId}
            guests={guests}
            onSelect={onSelect}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function ConversationItem({
  conv,
  isSelected,
  guests,
  onSelect,
  showTimer = false
}: {
  conv: AnyConversation;
  isSelected: boolean;
  guests: Record<string, GuestInfo>;
  onSelect: (id: string) => void;
  showTimer?: boolean;
}) {
  const lastMsg = conv.messages[0];
  const guest = conv.guestId ? guests[conv.guestId] : undefined;
  const displayName = getDisplayName(conv, guest);
  const avatarUrl = getTelegramAvatarUrl(guest?.telegramChatId);

  return (
    <button
      data-testid='conversation-item'
      onClick={() => onSelect(conv.id)}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
        isSelected && 'bg-blue-50',
        conv.unreadByManager && !isSelected && 'border-l-2 border-blue-500'
      )}
    >
      <div className='flex items-start gap-3'>
        {/* Avatar with channel icon overlay */}
        <div className='relative mt-0.5 shrink-0'>
          <Avatar className='h-9 w-9'>
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className='text-xs'>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div className='absolute -bottom-0.5 -right-0.5 scale-75'>
            <ChannelBadge channel={conv.channel} />
          </div>
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center justify-between gap-1'>
            <span
              className={cn(
                'truncate text-sm',
                conv.unreadByManager ? 'font-semibold' : 'font-medium'
              )}
            >
              {displayName}
            </span>
            <div className='flex shrink-0 items-center gap-1'>
              {showTimer && conv.lastMessageAt && <UnansweredTimer since={conv.lastMessageAt} />}
              <span className='text-muted-foreground text-[10px]'>
                {conv.lastMessageAt
                  ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                      addSuffix: false,
                      locale: uk
                    })
                  : ''}
              </span>
            </div>
          </div>

          <div className='mt-0.5 flex items-center gap-1.5'>
            {conv.inbox?.brand?.name && (
              <span className='text-muted-foreground truncate text-[10px]'>
                {conv.inbox.brand.name}
              </span>
            )}
            {conv.assignedTo && (
              <span className='text-muted-foreground text-[10px]'>
                {(conv.assignedTo.name ?? '').split(' ')[0]}
              </span>
            )}
          </div>

          {lastMsg && (
            <p
              className={cn(
                'mt-1 truncate text-xs',
                conv.unreadByManager ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {lastMsg.direction === 'OUTBOUND' ? '↩ ' : ''}
              {lastMsg.content}
            </p>
          )}
        </div>

        {conv.unreadByManager && <div className='mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500' />}
      </div>
    </button>
  );
}
