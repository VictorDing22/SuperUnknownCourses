import { AuthGate } from '@/components/auth-gate';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
