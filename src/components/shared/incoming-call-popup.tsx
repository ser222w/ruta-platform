'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCallStore } from '@/lib/stores/call-store';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

const AUTO_DISMISS_MS = 30_000;

function formatPhone(phone: string): string {
  // +380671234567 → +38 067 123 45 67
  const m = phone.match(/^(\+38)(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}`;
  return phone;
}

function formatLtv(ltv: number): string {
  return `₴${ltv.toLocaleString('uk-UA')}`;
}

function formatLastStay(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('uk-UA', { month: 'short', year: 'numeric' });
}

export function IncomingCallPopup() {
  const { activeCall, dismissCall } = useCallStore();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss після 30 сек
  useEffect(() => {
    if (!activeCall) return;
    timerRef.current = setTimeout(dismissCall, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeCall, dismissCall]);

  if (!activeCall) return null;

  function handleOpen() {
    router.push(`/dashboard/inquiries/${activeCall!.inquiryId}`);
    dismissCall();
  }

  const hasGuest = Boolean(activeCall.guestId);
  const lastStay = formatLastStay(activeCall.guestLastStay);

  return (
    <div
      data-testid='incoming-call-popup'
      className='fixed right-4 top-4 z-50 w-80 rounded-xl border border-border bg-background shadow-xl'
      role='alertdialog'
      aria-live='assertive'
    >
      {/* Header */}
      <div className='flex items-center gap-2 rounded-t-xl bg-green-500/10 px-4 py-3 text-green-600 dark:text-green-400'>
        <Icons.phone className='h-4 w-4 animate-pulse' />
        <span className='text-sm font-semibold'>Вхідний дзвінок</span>
      </div>

      {/* Body */}
      <div className='px-4 py-3'>
        {/* Caller info */}
        <div className='mb-1 flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-muted'>
            <Icons.user className='h-4 w-4 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-medium leading-tight'>
              {hasGuest && activeCall.callerName ? activeCall.callerName : 'Новий гість'}
            </p>
            <p className='text-xs text-muted-foreground'>{formatPhone(activeCall.callerPhone)}</p>
          </div>
        </div>

        {/* Guest stats */}
        {hasGuest && (
          <div className='mt-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground'>
            {(activeCall.guestStayCount ?? 0) > 0 && (
              <span>
                {activeCall.guestStayCount} заїзд
                {(activeCall.guestStayCount ?? 0) > 1 ? 'и' : ''}
              </span>
            )}
            {(activeCall.guestLtv ?? 0) > 0 && (
              <span> · LTV {formatLtv(activeCall.guestLtv!)}</span>
            )}
            {activeCall.guestLastProperty && lastStay && (
              <span>
                {' '}
                · {activeCall.guestLastProperty}, {lastStay}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className='flex gap-2 border-t border-border px-4 py-3'>
        <Button size='sm' className='flex-1' onClick={handleOpen}>
          Відкрити картку
        </Button>
        <Button size='sm' variant='outline' className='flex-1' onClick={dismissCall}>
          <Icons.phone className='mr-1 h-3 w-3 rotate-135' />
          Відхилити
        </Button>
      </div>
    </div>
  );
}
