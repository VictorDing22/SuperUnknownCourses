'use client';

import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { clearAuthSession, loginHref, readAuthSession, roleLabel } from '@/lib/auth';
import type { AuthSession } from '@/lib/auth';

/**
 * 顶栏右侧的当前用户标识。
 * 未登录时不渲染（登录门禁会先拦住页面），避免静态导出时的水合差异。
 */
export function UserChip({ className }: { className?: string }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSession(readAuthSession());
      setMounted(true);
    };
    sync();
    window.addEventListener('focus', sync);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener('focus', sync);
      window.clearInterval(timer);
    };
  }, []);

  if (!mounted || !session) return null;

  const logout = () => {
    clearAuthSession();
    window.location.href = loginHref();
  };

  return (
    <span className={className}>
      <span className="hidden items-baseline gap-1.5 sm:inline-flex">
        <span className="max-w-[9rem] truncate text-[13px] font-medium text-foreground">
          {session.user.label}
        </span>
        <span className="text-[10px] tracking-wide text-muted-foreground/70">
          {roleLabel(session.user.role)}
        </span>
      </span>
      <button
        type="button"
        onClick={logout}
        title="退出登录"
        aria-label="退出登录"
        className="ml-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </span>
  );
}
