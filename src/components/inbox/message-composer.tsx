'use client';

import { useRef, useCallback, type KeyboardEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { QuickReplyBar } from './quick-reply-bar';
import { trpc } from '@/lib/trpc';

export interface Attachment {
  key: string;
  url: string;
  mime: string;
  name: string;
  size: number;
  bucket: 'public' | 'private';
}

async function uploadFileToR2(file: File, conversationId: string): Promise<Attachment> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const key = `inbox/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const presignRes = await fetch('/api/upload/presigned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, mime: file.type, size: file.size, bucket: 'public' })
  });
  if (!presignRes.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl, fileUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    fileUrl: string;
  };

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  });
  if (!uploadRes.ok) throw new Error('Upload to R2 failed');

  return { key, url: fileUrl, mime: file.type, name: file.name, size: file.size, bucket: 'public' };
}

interface MessageComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (attachments?: Attachment[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
}

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = 'Написати повідомлення… (Enter — відправити, Shift+Enter — новий рядок)',
  conversationId
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [quickReplySearchMode, setQuickReplySearchMode] = useState(false);

  const createQuickReply = trpc.inbox.createQuickReply.useMutation();

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    onChange(val);
    const hashMatch = val.match(/#(\w*)$/);
    if (hashMatch) {
      setQuickReplySearchMode(true);
      setQuickReplySearch(hashMatch[1] ?? '');
    } else if (quickReplySearchMode) {
      setQuickReplySearchMode(false);
    }
  }

  function handleQuickReplySelect(content: string) {
    onChange(value.replace(/#\w*$/, content));
    setQuickReplySearchMode(false);
  }

  async function handleSaveAsTemplate() {
    const title = window.prompt('Назва шаблону:');
    if (!title || !value.trim()) return;
    await createQuickReply.mutateAsync({ title, content: value.trim() });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || uploadedAttachments.length > 0) && !isLoading && !disabled) {
        handleSubmit();
      }
    }
  }

  function handleSubmit() {
    onSubmit(uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
    setUploadedAttachments([]);
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = '';
      if (!files.length || !conversationId) return;
      setUploading(true);
      try {
        const uploads = await Promise.all(files.map((f) => uploadFileToR2(f, conversationId)));
        setUploadedAttachments((prev) => [...prev, ...uploads]);
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setUploading(false);
      }
    },
    [conversationId]
  );

  const startRecording = useCallback(async () => {
    if (!conversationId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        try {
          const att = await uploadFileToR2(file, conversationId);
          setUploadedAttachments((prev) => [...prev, att]);
        } finally {
          setUploading(false);
        }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert('Мікрофон недоступний');
    }
  }, [conversationId]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  function removeAttachment(idx: number) {
    setUploadedAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className='border-t bg-white p-3'>
      {/* Attachment previews */}
      {uploadedAttachments.length > 0 && (
        <div className='mb-2 flex flex-wrap gap-2'>
          {uploadedAttachments.map((att, i) => (
            <div key={att.key} className='relative group'>
              {att.mime.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={att.url}
                  alt={att.name}
                  className='h-16 w-16 rounded-md object-cover border'
                />
              ) : att.mime.startsWith('audio/') ? (
                <div className='flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs h-10'>
                  🎙 {att.name}
                </div>
              ) : att.mime.startsWith('video/') ? (
                <div className='flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs h-10'>
                  🎥 {att.name}
                </div>
              ) : (
                <div className='flex h-16 w-32 items-center justify-center rounded-md border bg-gray-50 px-2 text-xs text-gray-600 truncate'>
                  📎 {att.name}
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className='absolute -right-1.5 -top-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white hover:bg-red-600'
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {uploading && (
        <div className='mb-2 text-xs text-muted-foreground flex items-center gap-1'>
          <span className='animate-spin inline-block'>⏳</span> Завантаження...
        </div>
      )}

      {/* Quick reply bar */}
      <div className='relative'>
        {quickReplySearchMode && (
          <QuickReplyBar
            searchMode
            search={quickReplySearch}
            onSelect={handleQuickReplySelect}
            onSaveCurrentAsTemplate={handleSaveAsTemplate}
            onCloseSearch={() => setQuickReplySearchMode(false)}
          />
        )}
        <QuickReplyBar
          onSelect={handleQuickReplySelect}
          onSaveCurrentAsTemplate={handleSaveAsTemplate}
        />
      </div>

      <div className='flex items-end gap-2'>
        {/* File attach button */}
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading || uploading}
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-colors',
            'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
          title='Прикріпити файл'
        >
          📎
        </button>

        {/* Voice recording button */}
        {isRecording ? (
          <button
            type='button'
            onClick={stopRecording}
            className='mb-0.5 flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs text-red-500 hover:text-red-600 animate-pulse'
            title='Зупинити запис'
          >
            ⏹ {recordingSeconds}с
          </button>
        ) : (
          <button
            type='button'
            onClick={startRecording}
            disabled={disabled || isLoading || uploading || !conversationId}
            className={cn(
              'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition-colors',
              'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              'disabled:cursor-not-allowed disabled:opacity-40'
            )}
            title='Голосове повідомлення'
          >
            🎙
          </button>
        )}

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
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={2}
          className='min-h-[60px] resize-none text-sm'
        />
        <Button
          onClick={handleSubmit}
          disabled={(!value.trim() && uploadedAttachments.length === 0) || isLoading || disabled}
          size='sm'
          className='mb-0.5 shrink-0'
        >
          {isLoading ? '…' : 'Надіслати'}
        </Button>
      </div>
    </div>
  );
}
