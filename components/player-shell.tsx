'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RotateCw, Smartphone } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import type { Course } from '@/lib/courses';
import { cn } from '@/lib/utils';

/** 超过这个时间还没加载完，提示"网络较慢" */
const SLOW_AFTER_MS = 10_000;
/** 超过这个时间判定加载失败，给重试和新窗口出口 */
const FAIL_AFTER_MS = 45_000;

export function PlayerShell({ course }: { course: Course }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(Date.now());

  const htmlPath = course.htmlPath;

  useEffect(() => {
    const applyHash = () => {
      setLoaded(false);
      setElapsed(0);
      startedAt.current = Date.now();
      const hash = window.location.hash;
      const bust = attempt > 0 ? `?retry=${attempt}` : '';
      setSrc(`${htmlPath}${bust}${hash}`);
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [htmlPath, attempt]);

  // 计时：给用户"还在动"的反馈，并在超时后给出出口
  useEffect(() => {
    if (loaded) return;
    const timer = window.setInterval(() => {
      setElapsed(Date.now() - startedAt.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loaded, attempt]);

  const retry = useCallback(() => {
    setLoaded(false);
    setElapsed(0);
    startedAt.current = Date.now();
    setAttempt((value) => value + 1);
  }, []);

  const failed = !loaded && elapsed >= FAIL_AFTER_MS;
  const slow = !loaded && elapsed >= SLOW_AFTER_MS;
  const seconds = Math.floor(elapsed / 1000);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      {src ? (
        <iframe
          src={src}
          title={course.title}
          className="h-dvh w-full border-0"
          allow="autoplay; fullscreen; clipboard-write"
          allowFullScreen
          onLoad={() => setLoaded(true)}
        />
      ) : null}

      <Link
        href={`/courses/${course.slug}/`}
        className="absolute left-1/2 top-2 z-20 hidden -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-900/55 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-slate-900/75 hover:text-white sm:inline-flex"
      >
        <ArrowLeft className="size-3.5" />
        返回课程
      </Link>

      <div
        className={cn(
          'absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-slate-950 px-6 text-center transition-opacity duration-500',
          loaded && 'pointer-events-none opacity-0',
        )}
        aria-hidden={loaded}
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute inset-0 bg-grid opacity-20" />
        </div>

        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white/5 text-primary ring-1 ring-white/10">
          <EurasiaMark className="h-7 w-auto" />
        </div>

        {failed ? (
          <div className="relative max-w-sm space-y-3">
            <h1 className="text-lg font-semibold text-white">课程加载失败</h1>
            <p className="text-sm leading-relaxed text-white/60">
              等待 {seconds} 秒仍未完成。课程包约 8 MB，移动网络较慢时可能失败，可以重试或在新窗口打开。
            </p>
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={retry}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <RotateCw className="size-4" />
                重试
              </button>
              <a
                href={`${htmlPath}${window.location.hash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                新窗口打开
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="relative space-y-2">
              <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50">SUPERUNKNOWN</p>
              <h1 className="text-balance text-xl font-semibold text-white sm:text-2xl">
                {course.title}
              </h1>
              <p className="text-sm text-white/50">
                {slow ? `网络较慢，继续加载中…（已等待 ${seconds} 秒）` : '正在加载课程…'}
              </p>
            </div>

            <div className="relative mt-1 flex items-center gap-3 text-xs text-white/45">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>首次加载约 8 MB，请稍候</span>
            </div>

            <div className="relative mt-2 h-1 w-56 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>

            {slow ? (
              <div className="relative mt-2 flex items-center gap-1.5 text-[11px] text-white/40">
                <Smartphone className="size-3.5" />
                手机建议横屏观看；4G 下通常需要 10–30 秒
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
