'use client';

import { useState } from 'react';
import { useQueryState } from 'nuqs';
import { trpc } from '@/lib/trpc';
import { useInboxSSE } from '@/hooks/use-inbox-sse';
import { ConversationList } from '@/components/inbox/conversation-list';
import { MessageThread } from '@/components/inbox/message-thread';
import { MessageComposer } from '@/components/inbox/message-composer';
import { ConversationContext } from '@/components/inbox/conversation-context';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Filter tab type
type TabFilter = 'unread' | 'mine' | 'all';

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'Всі канали' },
  { value: 'TELEGRAM', label: 'Telegram' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'ECHAT_VIBER', label: 'Viber' },
  { value: 'ECHAT_TG_PERSONAL', label: 'TG Personal' }
];

export function InboxView() {
  // Subscribe to SSE events — auto-invalidates query cache on new messages
  useInboxSSE();

  // URL state for conversation
  const [conversationId, setConversationId] = useQueryState('conv');

  // Local filter state
  const [tab, setTab] = useState<TabFilter>('unread');
  const [channel, setChannel] = useState('ALL');
  const [draft, setDraft] = useState('');

  // Counts badge
  const { data: counts } = trpc.inbox.getCounts.useQuery(undefined, {
    refetchInterval: 30_000
  });

  // Inboxes for brand filter
  const { data: inboxes } = trpc.inbox.listInboxes.useQuery();

  // Conversation list
  const { data: convData, isLoading: listLoading } = trpc.inbox.listConversations.useQuery({
    status: 'OPEN',
    channels: channel !== 'ALL' ? [channel] : undefined,
    assignedToMe: tab === 'mine',
    unreadOnly: tab === 'unread'
  });

  const conversations = convData?.items ?? [];
  // Map guestId → guest data for name/phone display
  const guestMap: Record<string, { name: string; phone?: string | null }> = {};
  for (const g of convData?.guests ?? []) {
    guestMap[g.id] = g;
  }

  // Messages for selected conversation
  const { data: msgData, isLoading: msgLoading } = trpc.inbox.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, refetchInterval: false }
  );

  // Send message mutation
  const utils = trpc.useUtils();
  const sendMutation = trpc.inbox.sendMessage.useMutation({
    onSuccess: () => {
      setDraft('');
      if (conversationId) {
        utils.inbox.getMessages.invalidate({ conversationId });
        utils.inbox.listConversations.invalidate();
      }
    }
  });

  // Mark read when opening conversation
  const markReadMutation = trpc.inbox.markRead.useMutation();

  function handleSelectConversation(id: string) {
    setConversationId(id);
    markReadMutation.mutate({ conversationId: id });
  }

  function handleSend(attachments?: { url: string; mime: string; name: string; size?: number }[]) {
    if (!draft.trim() && !attachments?.length) return;
    if (!conversationId) return;
    sendMutation.mutate({
      conversationId,
      content: draft.trim() || '[медіа]',
      attachments
    });
  }

  return (
    <div className='flex h-[calc(100vh-3.5rem)] flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between border-b px-4 py-2.5'>
        <div className='flex items-center gap-3'>
          <h1 className='text-base font-semibold'>Inbox</h1>
          {counts && counts.unread > 0 && (
            <Badge variant='destructive' className='text-xs'>
              {counts.unread}
            </Badge>
          )}
        </div>

        {/* Channel filter */}
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger className='h-7 w-40 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNEL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body: 3 columns */}
      <div className='flex min-h-0 flex-1'>
        {/* Column 1: Conversation list */}
        <div className='flex w-72 shrink-0 flex-col border-r'>
          {/* Tabs */}
          <div className='flex border-b'>
            {(['unread', 'mine', 'all'] as TabFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium transition-colors',
                  tab === t
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'unread'
                  ? `Нові${counts?.unread ? ` (${counts.unread})` : ''}`
                  : t === 'mine'
                    ? 'Мої'
                    : 'Всі'}
              </button>
            ))}
          </div>

          {/* List */}
          <div className='min-h-0 flex-1'>
            {listLoading ? (
              <div className='p-4 text-center text-sm text-gray-400'>Завантаження…</div>
            ) : (
              <ConversationList
                conversations={conversations}
                selectedId={conversationId ?? undefined}
                onSelect={handleSelectConversation}
                guests={guestMap}
              />
            )}
          </div>
        </div>

        {/* Column 2: Message thread */}
        <div className='flex min-h-0 flex-1 flex-col'>
          {conversationId ? (
            <>
              <div className='min-h-0 flex-1'>
                <MessageThread messages={msgData?.items ?? []} isLoading={msgLoading} />
              </div>
              <MessageComposer
                value={draft}
                onChange={setDraft}
                onSubmit={handleSend}
                isLoading={sendMutation.isPending}
              />
            </>
          ) : (
            <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
              Оберіть розмову
            </div>
          )}
        </div>

        {/* Column 3: Context panel */}
        <div className='w-64 shrink-0 border-l'>
          {conversationId ? (
            <ConversationContext conversationId={conversationId} />
          ) : (
            <div className='text-muted-foreground flex h-full items-center justify-center p-4 text-center text-xs'>
              Контекст гостя
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
