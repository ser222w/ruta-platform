'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface UnansweredTimerProps {
  since: Date | string;
}

export function UnansweredTimer({ since }: UnansweredTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const sinceMs = new Date(since).getTime();
    const update = () => setElapsed(Date.now() - sinceMs);
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [since]);

  const minutes = Math.floor(elapsed / 60_000);
  const hours = Math.floor(minutes / 60);

  const isRed = minutes >= 60;
  const isOrange = minutes >= 30 && !isRed;

  const label = hours > 0 ? `${hours}г` : `${minutes}хв`;

  if (minutes < 1) return null;

  return (
    <span
      className={cn(
        'text-xs font-medium rounded px-1 py-0.5',
        isRed && 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-300',
        isOrange && 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300',
        !isRed && !isOrange && 'text-muted-foreground'
      )}
    >
      {label}
    </span>
  );
}
