'use client';

import { useState } from 'react';
import { useQueryState, parseAsString } from 'nuqs';
import { trpc } from '@/lib/trpc';
import { useInboxSSE } from '@/hooks/use-inbox-sse';
import { ConversationList } from '@/components/inbox/conversation-list';
import { MessageThread } from '@/components/inbox/message-thread';
import { MessageComposer, type Attachment } from '@/components/inbox/message-composer';
import { ConversationContext } from '@/components/inbox/conversation-context';
import { ChatTabs, type ChatTab } from '@/components/inbox/chat-tabs';
import { NotesTab } from '@/components/inbox/notes-tab';
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

  // URL state for view dimension
  const [view, setView] = useQueryState('view', parseAsString.withDefault('mine'));

  // Local filter state
  const [channel, setChannel] = useState('ALL');
  const [draft, setDraft] = useState('');
  const [chatTab, setChatTab] = useState<ChatTab>('chat');

  // Counts badge
  const { data: counts } = trpc.inbox.getCounts.useQuery(undefined, {
    refetchInterval: 30_000
  });

  // Unanswered count
  const { data: unansweredData } = trpc.inbox.getUnansweredCount.useQuery(undefined, {
    refetchInterval: 30_000
  });
  const unansweredCount = unansweredData?.count ?? 0;

  // Inboxes for brand filter
  const { data: inboxes } = trpc.inbox.listInboxes.useQuery();

  // Build query params from view
  const queryParams = (() => {
    switch (view) {
      case 'mine':
        return { status: 'OPEN' as const, assignedToMe: true };
      case 'open':
        return { status: 'OPEN' as const };
      case 'resolved':
        return { status: 'RESOLVED' as const };
      case 'spam':
        return { status: 'SPAM' as const };
      case 'unanswered':
        return { status: 'OPEN' as const };
      default:
        return { status: 'OPEN' as const, assignedToMe: true };
    }
  })();

  // Conversation list
  const { data: convData, isLoading: listLoading } = trpc.inbox.listConversations.useQuery({
    ...queryParams,
    channels: channel !== 'ALL' ? [channel] : undefined
  });

  const conversations = convData?.items ?? [];
  const selectedConversation = conversations.find((c) => c.id === conversationId);
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

  function handleSend(attachments?: Attachment[]) {
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
          {/* Left nav — ownership dimension */}
          <nav className='flex flex-col gap-0.5 p-2' data-testid='inbox-nav'>
            {/* ALARM: Без відповіді */}
            <button
              onClick={() => setView('unanswered')}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                view === 'unanswered'
                  ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950'
              )}
            >
              <span className='flex items-center gap-2'>
                <span className='h-2 w-2 rounded-full bg-red-500 animate-pulse' />
                Без відповіді
              </span>
              {unansweredCount > 0 && (
                <span className='text-xs bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 dark:bg-red-900 dark:text-red-300'>
                  {unansweredCount}
                </span>
              )}
            </button>

            <div className='my-1 h-px bg-border' />

            <p className='px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Моя черга
            </p>
            <NavItem
              view='mine'
              label='Призначено мені'
              icon='👤'
              count={counts?.mine}
              current={view}
              setView={setView}
            />

            <div className='my-1 h-px bg-border' />

            <p className='px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
              Всі відкриті
            </p>
            <NavItem
              view='open'
              label='Відкриті'
              icon='💬'
              count={counts?.total}
              current={view}
              setView={setView}
            />
            <NavItem view='resolved' label='Закриті' icon='✓' current={view} setView={setView} />
            <NavItem view='spam' label='Спам' icon='🚫' current={view} setView={setView} />
          </nav>

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
              <ChatTabs
                active={chatTab}
                onChange={setChatTab}
                hasEmail={selectedConversation?.channel === 'EMAIL'}
              />
              {chatTab === 'chat' && (
                <>
                  <div className='min-h-0 flex-1'>
                    <MessageThread messages={msgData?.items ?? []} isLoading={msgLoading} />
                  </div>
                  <MessageComposer
                    value={draft}
                    onChange={setDraft}
                    onSubmit={handleSend}
                    isLoading={sendMutation.isPending}
                    conversationId={conversationId ?? undefined}
                  />
                </>
              )}
              {chatTab === 'notes' && (
                <div className='min-h-0 flex-1'>
                  <NotesTab conversationId={conversationId} />
                </div>
              )}
              {chatTab === 'email' && (
                <div className='flex-1 flex items-center justify-center text-sm text-muted-foreground p-8'>
                  Email thread — coming soon
                </div>
              )}
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

function NavItem({
  view: v,
  label,
  icon,
  count,
  current,
  setView
}: {
  view: string;
  label: string;
  icon: string;
  count?: number;
  current: string;
  setView: (v: string) => Promise<URLSearchParams>;
}) {
  return (
    <button
      onClick={() => setView(v)}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
        current === v
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50'
      )}
    >
      <span className='flex items-center gap-2'>
        <span>{icon}</span>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span className='text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5'>
          {count}
        </span>
      )}
    </button>
  );
}
