'use client';

import { useEffect, useState } from 'react';
import { CircleCheck, History } from 'lucide-react';
import { readAuthSession } from '@/lib/auth';
import { fetchProgress, type CourseProgress } from '@/lib/learning';

/**
 * 课程详情页的学习进度提示。
 * 未登录、没有进度、或接口不可用时什么都不渲染。
 */
export function CourseProgressCard({ slug }: { slug: string }) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);

  useEffect(() => {
    const session = readAuthSession();
    if (!session) return;
    let cancelled = false;
    fetchProgress(slug, session.accessToken).then((value) => {
      if (!cancelled) setProgress(value);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!progress || progress.scenesSeen <= 0) return null;

  const total = progress.totalScenes > 0 ? progress.totalScenes : 11;
  const percent = Math.min(100, Math.round((progress.scenesSeen / total) * 100));
  const completed = progress.scenesSeen >= total;

  return (
    <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border/70">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
          {completed ? (
            <CircleCheck className="size-4 text-primary" />
          ) : (
            <History className="size-4 text-primary" />
          )}
          {completed ? '已学完' : `上次学到第 ${progress.lastScene} 幕`}
        </span>
        <span className="text-muted-foreground">
          {progress.scenesSeen}/{total} 幕 · {percent}%
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}
