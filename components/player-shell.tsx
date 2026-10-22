'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import type { Course } from '@/lib/courses';
import { cn } from '@/lib/utils';

export function PlayerShell({ course }: { course: Course }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const applyHash = () => {
      setLoaded(false);
      setSrc(`${course.htmlPath}${window.location.hash}`);
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [course.htmlPath]);

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

        <div className="relative space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-white/50">SUPERUNKNOWN</p>
          <h1 className="text-balance text-xl font-semibold text-white sm:text-2xl">
            {course.title}
          </h1>
          <p className="text-sm text-white/50">正在加载课程…</p>
        </div>

        <div className="relative mt-1 flex items-center gap-3 text-xs text-white/45">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>首次加载约 8 MB，请稍候</span>
        </div>

        <div className="relative mt-2 h-1 w-56 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
