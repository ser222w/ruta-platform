'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface Attachment {
  url: string;
  mime: string;
  name: string;
  size?: number;
}

interface MessageItem {
  id: string;
  direction: string;
  content: string;
  sentAt: Date | string;
  attachments?: Attachment[] | null;
  sentBy?: { id: string; name: string; image?: string | null } | null;
}

interface MessageThreadProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  isLoading?: boolean;
  currentUserId?: string;
}

function MediaAttachment({ att, isOutbound }: { att: Attachment; isOutbound: boolean }) {
  const mime = att.mime ?? '';

  if (mime.startsWith('image/')) {
    return (
      <a href={att.url} target='_blank' rel='noopener noreferrer' className='block'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt={att.name}
          className='mt-1 max-h-60 max-w-xs rounded-lg object-cover'
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </a>
    );
  }

  if (mime.startsWith('audio/') || att.name?.match(/\.(ogg|mp3|m4a|wav|oga)$/i)) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <audio
        controls
        src={att.url}
        className={cn('mt-1 h-10 w-48', isOutbound ? 'accent-white' : '')}
      />
    );
  }

  if (mime.startsWith('video/')) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video controls src={att.url} className='mt-1 max-h-48 max-w-xs rounded-lg' />
    );
  }

  // Generic file
  return (
    <a
      href={att.url}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'mt-1 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs underline-offset-2 hover:underline',
        isOutbound ? 'border-blue-400 text-blue-100' : 'border-gray-200 text-blue-600'
      )}
    >
      <span>📎</span>
      <span className='max-w-[180px] truncate'>{att.name}</span>
      {att.size && (
        <span className='text-[10px] opacity-70'>({Math.round(att.size / 1024)}KB)</span>
      )}
    </a>
  );
}

export function MessageThread({ messages, isLoading }: MessageThreadProps) {
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
        {messages.map((msg: MessageItem) => {
          const isOutbound = msg.direction === 'OUTBOUND';
          const attachments: Attachment[] = Array.isArray(msg.attachments) ? msg.attachments : [];

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

                {/* Text content */}
                {msg.content && msg.content !== '[медіа]' && (
                  <p className='whitespace-pre-wrap text-sm leading-relaxed'>{msg.content}</p>
                )}

                {/* Attachments */}
                {attachments.map((att, i) => (
                  <MediaAttachment key={i} att={att} isOutbound={isOutbound} />
                ))}

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
