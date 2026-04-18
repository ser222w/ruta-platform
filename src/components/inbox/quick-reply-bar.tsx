'use client';

import { trpc } from '@/lib/trpc';

interface QuickReplyBarProps {
  brandId?: string;
  onSelect: (content: string) => void;
  onSaveCurrentAsTemplate: () => void;
  search?: string;
  searchMode?: boolean;
  onCloseSearch?: () => void;
}

export function QuickReplyBar({
  brandId,
  onSelect,
  onSaveCurrentAsTemplate,
  search = '',
  searchMode = false,
  onCloseSearch
}: QuickReplyBarProps) {
  const { data: replies = [] } = trpc.inbox.listQuickReplies.useQuery(
    { brandId, search: search || undefined },
    { staleTime: 30_000 }
  );

  if (searchMode) {
    return (
      <div className='absolute bottom-full left-0 right-0 bg-popover border border-border rounded-t-lg shadow-lg max-h-64 overflow-y-auto z-50'>
        <div className='flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground border-b'>
          <span>Шаблони{search ? ` · "${search}"` : ''}</span>
          <button onClick={onCloseSearch} className='hover:text-foreground'>
            ✕
          </button>
        </div>
        {replies.length === 0 && (
          <div className='p-3 text-sm text-muted-foreground'>Нічого не знайдено</div>
        )}
        {replies.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              onSelect(r.content);
              onCloseSearch?.();
            }}
            className='w-full text-left px-3 py-2 hover:bg-accent transition-colors'
          >
            <div className='text-sm font-medium'>{r.title}</div>
            <div className='text-xs text-muted-foreground truncate'>{r.content.slice(0, 80)}</div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1.5 px-3 py-1.5 border-t border-border overflow-x-auto scrollbar-none'>
      <span className='text-xs text-muted-foreground flex-shrink-0'>Шаблони:</span>
      {replies.slice(0, 8).map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r.content)}
          className='flex-shrink-0 text-xs bg-muted hover:bg-accent rounded-full px-2.5 py-1 transition-colors'
        >
          {r.title}
        </button>
      ))}
      <button
        onClick={onSaveCurrentAsTemplate}
        className='flex-shrink-0 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2.5 py-1'
      >
        + Зберегти
      </button>
    </div>
  );
}
