'use client';

import { useRef, type KeyboardEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AttachmentPreview {
  file: File;
  url: string; // object URL for preview
  mime: string;
  name: string;
}

interface MessageComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (attachments?: { url: string; mime: string; name: string; size?: number }[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachments.length > 0) && !isLoading && !disabled) {
        handleSubmit();
      }
    }
  }

  function handleSubmit() {
    const atts = attachments.map((a) => ({
      url: a.url,
      mime: a.mime,
      name: a.name,
      size: a.file.size
    }));
    onSubmit(atts.length > 0 ? atts : undefined);
    // cleanup previews
    attachments.forEach((a) => URL.revokeObjectURL(a.url));
    setAttachments([]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const previews = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      mime: f.type,
      name: f.name
    }));
    setAttachments((prev) => [...prev, ...previews]);
    // reset input so same file can be picked again
    e.target.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[idx]!.url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  return (
    <div className='border-t bg-white p-3'>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-2'>
          {attachments.map((att, i) => (
            <div key={i} className='relative'>
              {att.mime.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.url}
                  alt={att.name}
                  className='h-16 w-16 rounded-md object-cover border'
                />
              ) : att.mime.startsWith('audio/') ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio src={att.url} controls className='h-10 w-36' />
              ) : (
                <div className='flex h-16 w-32 items-center justify-center rounded-md border bg-gray-50 px-2 text-xs text-gray-600 truncate'>
                  📎 {att.name}
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className='absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600'
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className='flex items-end gap-2'>
        {/* File attach button */}
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-colors',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
          title='Прикріпити файл'
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type='file'
          multiple
          accept='image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx'
          onChange={handleFileChange}
          className='hidden'
        />

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
          onClick={handleSubmit}
          disabled={(!value.trim() && attachments.length === 0) || isLoading || disabled}
          size='sm'
          className='mb-0.5 shrink-0'
        >
          {isLoading ? '…' : 'Надіслати'}
        </Button>
      </div>
    </div>
  );
}
