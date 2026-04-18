'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { uk } from 'date-fns/locale';

interface NotesTabProps {
  conversationId: string;
}

export function NotesTab({ conversationId }: NotesTabProps) {
  const [content, setContent] = useState('');
  const utils = trpc.useUtils();

  const { data: notes = [] } = trpc.inbox.getNotes.useQuery({ conversationId });

  const createNote = trpc.inbox.createNote.useMutation({
    onSuccess: () => {
      setContent('');
      void utils.inbox.getNotes.invalidate({ conversationId });
    }
  });

  const deleteNote = trpc.inbox.deleteNote.useMutation({
    onSuccess: () => void utils.inbox.getNotes.invalidate({ conversationId })
  });

  return (
    <div className='flex flex-col h-full'>
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {notes.length === 0 && (
          <p className='text-sm text-muted-foreground text-center py-8'>
            Немає нотаток. Внутрішні нотатки видно тільки команді.
          </p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className='bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 space-y-1'
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Avatar className='h-5 w-5'>
                  <AvatarFallback className='text-[10px]'>
                    {(note.createdBy.name ?? '?').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className='text-xs font-medium'>{note.createdBy.name}</span>
                <span className='text-xs text-muted-foreground'>
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true, locale: uk })}
                </span>
              </div>
              <button
                onClick={() => deleteNote.mutate({ noteId: note.id })}
                className='text-xs text-muted-foreground hover:text-destructive'
              >
                ×
              </button>
            </div>
            <p className='text-sm whitespace-pre-wrap'>{note.content}</p>
          </div>
        ))}
      </div>
      <div className='p-3 border-t border-border space-y-2'>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder='Внутрішня нотатка (не відправляється гостю)...'
          className='resize-none text-sm bg-yellow-50/50 dark:bg-yellow-950/10'
          rows={3}
        />
        <Button
          size='sm'
          onClick={() => createNote.mutate({ conversationId, content })}
          disabled={!content.trim() || createNote.isPending}
        >
          Додати нотатку
        </Button>
      </div>
    </div>
  );
}
