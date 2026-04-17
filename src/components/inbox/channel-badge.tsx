import { Badge } from '@/components/ui/badge';
import type { ChannelType } from '@prisma/client';

const CHANNEL_CONFIG: Record<string, { label: string; color: string }> = {
  TELEGRAM: { label: 'Telegram', color: 'bg-blue-100 text-blue-700' },
  EMAIL: { label: 'Email', color: 'bg-gray-100 text-gray-700' },
  SMS: { label: 'SMS', color: 'bg-green-100 text-green-700' },
  ECHAT_VIBER: { label: 'Viber', color: 'bg-purple-100 text-purple-700' },
  ECHAT_TG_PERSONAL: { label: 'TG Personal', color: 'bg-sky-100 text-sky-700' },
  FACEBOOK: { label: 'Facebook', color: 'bg-blue-100 text-blue-800' },
  INSTAGRAM: { label: 'Instagram', color: 'bg-pink-100 text-pink-700' },
  WHATSAPP: { label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-700' },
  UNKNOWN: { label: 'Невідомо', color: 'bg-gray-100 text-gray-500' }
};

export function ChannelBadge({ channel }: { channel: string }) {
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG['UNKNOWN']!;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}
