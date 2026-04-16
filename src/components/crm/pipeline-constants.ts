import type { BookingStage } from '@prisma/client';

// Стадії що показуємо в kanban (перші 8 активних)
export const PIPELINE_COLUMNS: { stage: BookingStage; label: string; color: string }[] = [
  { stage: 'QUALIFY', label: 'Кваліфікація', color: 'bg-slate-100 dark:bg-slate-800' },
  { stage: 'PROPOSAL_1', label: 'Пропозиція 1', color: 'bg-blue-50 dark:bg-blue-950' },
  { stage: 'REFUSAL_1', label: 'Відмова 1', color: 'bg-red-50 dark:bg-red-950' },
  { stage: 'PROPOSAL_2', label: 'Пропозиція 2', color: 'bg-blue-50 dark:bg-blue-950' },
  { stage: 'REFUSAL_2', label: 'Відмова 2', color: 'bg-red-50 dark:bg-red-950' },
  { stage: 'PROPOSAL_3', label: 'Пропозиція 3', color: 'bg-blue-50 dark:bg-blue-950' },
  { stage: 'INVOICE', label: 'Рахунок', color: 'bg-yellow-50 dark:bg-yellow-950' },
  { stage: 'PREPAYMENT', label: 'Передоплата', color: 'bg-green-50 dark:bg-green-950' }
];

export const STAGE_LABELS: Record<BookingStage, string> = {
  QUALIFY: 'Кваліфікація',
  PROPOSAL_1: 'Пропозиція 1',
  REFUSAL_1: 'Відмова 1',
  PROPOSAL_2: 'Пропозиція 2',
  REFUSAL_2: 'Відмова 2',
  PROPOSAL_3: 'Пропозиція 3',
  REFUSAL_3: 'Відмова 3',
  PROPOSAL_4: 'Пропозиція 4',
  INVOICE: 'Рахунок',
  PREPAYMENT: 'Передоплата',
  DEVELOPMENT: 'Розвиток',
  CHECKIN: 'Заселення',
  CHECKOUT: 'Виїзд',
  LOST: 'Втрачений'
};

export const STAGE_BADGE_VARIANT: Record<
  BookingStage,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  QUALIFY: 'secondary',
  PROPOSAL_1: 'default',
  REFUSAL_1: 'destructive',
  PROPOSAL_2: 'default',
  REFUSAL_2: 'destructive',
  PROPOSAL_3: 'default',
  REFUSAL_3: 'destructive',
  PROPOSAL_4: 'default',
  INVOICE: 'outline',
  PREPAYMENT: 'default',
  DEVELOPMENT: 'default',
  CHECKIN: 'default',
  CHECKOUT: 'default',
  LOST: 'destructive'
};
