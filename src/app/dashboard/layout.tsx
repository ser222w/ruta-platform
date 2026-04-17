import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { AppEventsProvider } from '@/components/shared/app-events-provider';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/server/auth';
import { db } from '@/server/db';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';

export const metadata: Metadata = {
  title: 'Ruta OS',
  description: 'Operational platform for RUTA Group',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

  const session = await auth.api.getSession({ headers: await headers() });
  let role = 'CLOSER';
  const sessionUser = session?.user
    ? { name: session.user.name ?? '', email: session.user.email ?? '' }
    : { name: 'RUTA User', email: '' };

  if (session?.user?.id) {
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    if (dbUser) role = dbUser.role;
  }

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <InfobarProvider defaultOpen={false}>
          <AppSidebar user={sessionUser} role={role} />
          <SidebarInset>
            <Header />
            {/* page main content */}
            {children}
            {/* page main content ends */}
          </SidebarInset>
          <InfoSidebar side='right' />
        </InfobarProvider>
      </SidebarProvider>
      {/* Real-time events: SSE + screen pop */}
      <AppEventsProvider />
    </KBar>
  );
}
