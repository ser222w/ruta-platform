'use client';

import { cn } from '@/lib/utils';

export type ChatTab = 'chat' | 'notes' | 'email';

interface ChatTabsProps {
  active: ChatTab;
  onChange: (tab: ChatTab) => void;
  hasEmail?: boolean;
}

export function ChatTabs({ active, onChange, hasEmail = false }: ChatTabsProps) {
  const tabs: { id: ChatTab; label: string; icon: string }[] = [
    { id: 'chat', label: 'Чат', icon: '💬' },
    { id: 'notes', label: 'Нотатки', icon: '📝' },
    ...(hasEmail ? [{ id: 'email' as ChatTab, label: 'Email', icon: '📧' }] : [])
  ];

  return (
    <div className='flex border-b border-border'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            active === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}
        >
          <span>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
