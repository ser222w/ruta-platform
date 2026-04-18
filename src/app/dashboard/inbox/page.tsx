import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { InboxView } from './inbox-view';

export default function InboxPage() {
  return (
    <NuqsAdapter>
      <InboxView />
    </NuqsAdapter>
  );
}
