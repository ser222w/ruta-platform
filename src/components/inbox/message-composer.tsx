'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = 'Написати повідомлення… (Enter — відправити, Shift+Enter — новий рядок)'
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  }

  return (
    <div className='border-t bg-white p-3'>
      <div className='flex items-end gap-2'>
        <Textarea
          ref={textareaRef}
          data-testid='message-composer'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={2}
          className='min-h-[60px] resize-none text-sm'
        />
        <Button
          onClick={onSubmit}
          disabled={!value.trim() || isLoading || disabled}
          size='sm'
          className='mb-0.5 shrink-0'
        >
          {isLoading ? '…' : 'Надіслати'}
        </Button>
      </div>
    </div>
  );
}
