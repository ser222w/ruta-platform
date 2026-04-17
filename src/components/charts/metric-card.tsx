import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  delta?: string;
  deltaType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaType = 'neutral',
  icon,
  className,
  'data-testid': testId
}: MetricCardProps) {
  const deltaColor =
    deltaType === 'increase'
      ? 'text-green-600'
      : deltaType === 'decrease'
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <div
      data-testid={testId}
      className={cn('bg-card border rounded-xl p-5 flex flex-col gap-1 shadow-sm', className)}
    >
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground font-medium'>{title}</p>
        {icon && <span className='text-muted-foreground'>{icon}</span>}
      </div>
      <p className='text-2xl font-semibold tracking-tight'>{value}</p>
      {delta && <p className={cn('text-xs font-medium', deltaColor)}>{delta}</p>}
    </div>
  );
}
