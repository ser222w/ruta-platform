export function DeployBadge() {
  const sha = process.env.NEXT_PUBLIC_DEPLOY_SHA ?? 'dev';
  const date = process.env.NEXT_PUBLIC_DEPLOY_DATE ?? '';
  const log = process.env.NEXT_PUBLIC_DEPLOY_LOG ?? '';

  return (
    <div className='pointer-events-none fixed bottom-2 right-3 z-50 text-right font-mono text-[10px] leading-tight text-gray-400/50 select-none'>
      <div>v1.0.0 · {sha}</div>
      {date && <div>{date}</div>}
      {log && <div className='max-w-[200px] truncate'>{log}</div>}
    </div>
  );
}
