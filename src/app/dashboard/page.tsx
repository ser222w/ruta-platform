import { redirect } from 'next/navigation';

export default async function Dashboard() {
  // TODO: check Better-Auth session cookie here
  redirect('/dashboard/overview');
}
