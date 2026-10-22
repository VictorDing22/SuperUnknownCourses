import { AuthGate } from '@/components/auth-gate';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AuthGate>{children}</AuthGate>
      </main>
      <SiteFooter />
    </div>
  );
}
