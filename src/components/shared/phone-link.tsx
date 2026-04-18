'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { callGuest } from '@/server/ringostat/actions';

interface PhoneLinkProps {
  phone: string | null | undefined;
  className?: string;
}

export function PhoneLink({ phone, className }: PhoneLinkProps) {
  const [isPending, startTransition] = useTransition();

  if (!phone) return null;

  function handleClick() {
    startTransition(async () => {
      const result = await callGuest(phone!);
      if (result.ok) {
        toast.success('Дзвінок ініційовано — очікуйте дзвінок на ваш телефон');
      } else {
        toast.error(result.error ?? 'Не вдалося ініціювати дзвінок');
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'inline-flex items-center gap-1 text-sm hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity',
        className
      )}
      title='Натисніть щоб зателефонувати'
    >
      <Icons.phone className='h-3 w-3 shrink-0' />
      {isPending ? 'Дзвоню...' : phone}
    </button>
  );
}
