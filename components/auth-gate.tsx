'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, LogIn } from 'lucide-react';
import { loginHref, readAuthSession } from '@/lib/auth';
import { EurasiaMark } from '@/components/eurasia-mark';

type GateState = 'checking' | 'ok' | 'denied';

/**
 * 前端登录门禁。
 *
 * 注意：这只是体验层——sessionStorage 是客户端数据，改一下就能绕过。
 * 真正的权限（谁能看什么、谁能写进度）必须由跨界平台的接口校验。
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    const check = () => setState(readAuthSession() ? 'ok' : 'denied');
    check();
    // 从登录页返回、切换标签页、token 过期时都能及时刷新状态
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = window.setInterval(check, 30_000);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(timer);
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <EurasiaMark className="h-6 w-auto animate-pulse text-primary" />
          <span className="text-xs tracking-wide">正在确认登录状态…</span>
        </div>
      </div>
    );
  }

  if (state === 'denied') {
    const returnTo =
      typeof window === 'undefined' ? undefined : window.location.pathname + window.location.hash;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-border/70">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <GraduationCap className="size-6" />
          </span>
          <h1 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            需要先登录跨界探索平台
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            课程广场使用工作室平台的账号，登录后再回到这里即可继续学习。
          </p>
          <a
            href={loginHref(returnTo)}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <LogIn className="size-4" />
            去登录
          </a>
          <p className="mt-4 text-xs text-muted-foreground/70">
            登录页会记住你要回到
            <span className="mx-1 font-mono text-foreground/70">/plaza/</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
