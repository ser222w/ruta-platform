import { redirect } from 'next/navigation';

export default async function Page() {
  // TODO: check Better-Auth session cookie here
  redirect('/dashboard/overview');
}
