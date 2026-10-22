'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { readAuthSession } from '@/lib/auth';
import { fetchMyCourses, type MineCourse } from '@/lib/course-admin';

/**
 * 我的课程。
 *
 * 课程中心里属于"我"的视角：哪些课学过、学到第几幕、从哪继续。
 * 进度由播放页的心跳与场景轮询写入后端，这里只读。
 */
export default function MyCoursesPage() {
  const [courses, setCourses] = useState<MineCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
    try {
      setCourses(await fetchMyCourses(token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = readAuthSession();
    if (!session) {
      setLoading(false);
      return;
    }
    load(session.accessToken);
  }, [load]);

  const started = courses.filter((course) => course.scenesSeen > 0);
  const fresh = courses.filter((course) => course.scenesSeen === 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-border/60 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">我的课程</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">继续上次的学习，或者挑一门新课程开始。</p>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在加载…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-destructive/25 bg-destructive/[0.05] px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          <Section title="继续学习" courses={started} empty="还没开始任何课程，从下面挑一门吧。" highlight />
          {fresh.length > 0 ? <Section title="全部课程" courses={fresh} empty="" /> : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  courses,
  empty,
  highlight = false,
}: {
  title: string;
  courses: MineCourse[];
  empty: string;
  highlight?: boolean;
}) {
  if (courses.length === 0 && !empty) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold tracking-tight text-foreground/80">{title}</h2>
      {courses.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const total = course.totalScenes || 11;
            const percent = Math.min(100, Math.round((course.scenesSeen / total) * 100));
            const completed = course.scenesSeen >= total;
            return (
              <Link
                key={course.slug}
                href={`/courses/view/?slug=${encodeURIComponent(course.slug)}`}
                className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary/30"
              >
                <span className="relative block aspect-[16/9] overflow-hidden bg-secondary">
                  {course.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.cover}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <BookOpen className="size-8" />
                    </span>
                  )}
                  {completed ? (
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-medium text-primary-foreground">
                      <CheckCircle2 className="size-3" />
                      已学完
                    </span>
                  ) : null}
                </span>

                <span className="flex flex-1 flex-col gap-2 p-4">
                  <strong className="text-[14px] font-semibold leading-snug text-foreground">{course.title}</strong>
                  <span className="text-[12px] text-muted-foreground">
                    {course.scenesSeen > 0 ? `上次学到第 ${course.lastScene} 幕` : course.subtitle || '还没开始'}
                  </span>

                  <span className="mt-auto pt-1">
                    <span className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {course.scenesSeen}/{total} 幕
                      </span>
                      <span>{percent}%</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-secondary">
                      <span
                        className={highlight ? 'block h-full rounded-full bg-primary' : 'block h-full rounded-full bg-primary/70'}
                        style={{ width: `${Math.max(percent, course.scenesSeen > 0 ? 4 : 0)}%` }}
                      />
                    </span>
                  </span>

                  <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                    {course.scenesSeen > 0 ? '继续学习' : '开始学习'}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
