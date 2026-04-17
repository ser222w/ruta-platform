'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageItem {
  id: string;
  direction: string;
  content: string;
  sentAt: Date | string;
  sentBy?: { id: string; name: string; image?: string | null } | null;
}

interface MessageThreadProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  isLoading?: boolean;
  currentUserId?: string;
}

export function MessageThread({ messages, isLoading, currentUserId }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className='space-y-4 p-4'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn('flex gap-2', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
            <Skeleton className='h-10 w-48 rounded-lg' />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
        Немає повідомлень
      </div>
    );
  }

  return (
    <ScrollArea className='h-full'>
      <div className='space-y-3 p-4'>
        {messages.map((msg) => {
          const isOutbound = msg.direction === 'OUTBOUND';

          return (
            <div
              key={msg.id}
              className={cn('flex items-end gap-2', isOutbound ? 'justify-end' : 'justify-start')}
            >
              {!isOutbound && (
                <Avatar className='h-7 w-7 shrink-0'>
                  <AvatarFallback className='text-[10px]'>Г</AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-2.5',
                  isOutbound
                    ? 'rounded-br-sm bg-blue-600 text-white'
                    : 'rounded-bl-sm bg-gray-100 text-gray-900'
                )}
              >
                {isOutbound && msg.sentBy && (
                  <p className='mb-0.5 text-[10px] font-medium text-blue-200'>{msg.sentBy.name}</p>
                )}
                <p className='whitespace-pre-wrap text-sm leading-relaxed'>{msg.content}</p>
                <p
                  className={cn(
                    'mt-1 text-right text-[10px]',
                    isOutbound ? 'text-blue-200' : 'text-gray-400'
                  )}
                >
                  {format(new Date(msg.sentAt), 'HH:mm', { locale: uk })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
