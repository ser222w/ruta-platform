'use client';

import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChannelBadge } from './channel-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ConversationItem {
  id: string;
  channel: string;
  status: string;
  unreadByManager: boolean;
  lastMessageAt: Date | string | null;
  messages: Array<{ content: string; direction: string; sentAt: Date | string }>;
  inbox: { name: string; channelType: string; brand?: { name: string } | null };
  assignedTo?: { id: string; name: string; image?: string | null } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConversation = any;

interface ConversationListProps {
  conversations: AnyConversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  guestNames?: Record<string, string>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  guestNames = {}
}: ConversationListProps) {
  return (
    <ScrollArea className='h-full'>
      <div className='divide-y'>
        {conversations.length === 0 && (
          <div className='text-muted-foreground py-12 text-center text-sm'>
            Нових звернень немає
          </div>
        )}
        {conversations.map((conv) => {
          const lastMsg = conv.messages[0];
          const guestName = guestNames[conv.id] ?? 'Гість';
          const isSelected = conv.id === selectedId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                isSelected && 'bg-blue-50',
                conv.unreadByManager && !isSelected && 'border-l-2 border-blue-500'
              )}
            >
              <div className='flex items-start gap-3'>
                <Avatar className='mt-0.5 h-9 w-9 shrink-0'>
                  <AvatarFallback className='text-xs'>{getInitials(guestName)}</AvatarFallback>
                </Avatar>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-1'>
                    <span
                      className={cn(
                        'truncate text-sm',
                        conv.unreadByManager ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {guestName}
                    </span>
                    <span className='text-muted-foreground shrink-0 text-[10px]'>
                      {conv.lastMessageAt
                        ? formatDistanceToNow(new Date(conv.lastMessageAt), {
                            addSuffix: false,
                            locale: uk
                          })
                        : ''}
                    </span>
                  </div>

                  <div className='mt-0.5 flex items-center gap-1.5'>
                    <ChannelBadge channel={conv.channel} />
                    {conv.inbox.brand?.name && (
                      <span className='text-muted-foreground truncate text-[10px]'>
                        {conv.inbox.brand.name}
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

                {conv.unreadByManager && (
                  <div className='mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500' />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
