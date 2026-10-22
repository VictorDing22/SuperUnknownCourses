'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Layers, Puzzle, Search, X } from 'lucide-react';
import { ComingSoonCard } from '@/components/coming-soon-card';
import { readAuthSession } from '@/lib/auth';
import type { Course } from '@/lib/courses';

/** 课程广场的卡片数据：静态课程和接口课程都归一到这个形状 */
interface PlazaCourse {
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
  scenes: number;
  slides: number;
  interactive: number;
  quizzes: number;
  duration: string;
  tags: string[];
  level: string;
}

interface ApiCatalogRow {
  slug: string;
  title: string;
  subtitle?: string;
  cover?: string;
  totalScenes?: number;
  stats?: { slides?: number; interactive?: number; quizzes?: number };
  duration?: string;
  tags?: string[];
  level?: string;
}

function fromApi(row: ApiCatalogRow): PlazaCourse {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? '',
    cover: row.cover ?? '',
    scenes: Number(row.totalScenes ?? 0) || 0,
    slides: Number(row.stats?.slides ?? 0) || 0,
    interactive: Number(row.stats?.interactive ?? 0) || 0,
    quizzes: Number(row.stats?.quizzes ?? 0) || 0,
    duration: row.duration ?? '',
    tags: row.tags ?? [],
    level: row.level ?? '',
  };
}

function fromStatic(course: Course): PlazaCourse {
  return {
    slug: course.slug,
    title: course.title,
    subtitle: course.subtitle,
    cover: course.cover,
    scenes: course.stats.scenes,
    slides: course.stats.slides,
    interactive: course.stats.interactive,
    quizzes: course.stats.quizzes,
    duration: course.duration,
    tags: course.tags ?? [],
    level: course.level ?? '',
  };
}

/** 模糊匹配：先按子串，再退化为子序列（允许中间夹别的字） */
function fuzzyMatch(text: string, query: string): boolean {
  const haystack = text.toLowerCase().replace(/\s+/g, '');
  const needle = query.toLowerCase().replace(/\s+/g, '');
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

/**
 * 课程广场的搜索 + 网格。
 *
 * 优先读后端课程目录（教师上传的课程会出现在这里）；
 * 接口不可用时退回构建时的静态课程，保证页面不至于空白。
 */
export function CourseExplorer({ fallback }: { fallback: Course[] }) {
  const [keyword, setKeyword] = useState('');
  const [courses, setCourses] = useState<PlazaCourse[]>(() => fallback.map(fromStatic));
  const [source, setSource] = useState<'static' | 'api'>('static');

  useEffect(() => {
    const session = readAuthSession();
    if (!session) return;
    let cancelled = false;
    fetch('/api/course/catalog', {
      headers: { Accept: 'application/json', Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-cache',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled || !Array.isArray(payload) || payload.length === 0) return;
        setCourses(payload.map((row) => fromApi(row as ApiCatalogRow)));
        setSource('api');
      })
      .catch(() => {
        /* 接口不可用时保持静态列表 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!keyword.trim()) return courses;
    return courses.filter((course) =>
      fuzzyMatch([course.title, course.subtitle, ...course.tags, course.level].join(' '), keyword),
    );
  }, [courses, keyword]);

  const searching = keyword.trim().length > 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">全部课程</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            课程由 SuperUnknownMAIC 生成，支持字幕、全屏和离线播放
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex h-9 w-full min-w-[220px] items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 text-muted-foreground transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 sm:w-[260px]">
            <Search className="size-3.5 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索课程、标签或关键词"
              aria-label="搜索课程"
              className="h-full w-full min-w-0 border-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            {keyword ? (
              <button
                type="button"
                onClick={() => setKeyword('')}
                aria-label="清空搜索"
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-2.5" />
              </button>
            ) : null}
          </label>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {searching ? `${filtered.length} / ${courses.length}` : courses.length} 门
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-7 rounded-3xl border border-dashed border-border/80 bg-card/40 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">没有匹配「{keyword.trim()}」的课程</p>
          <p className="mt-1.5 text-xs text-muted-foreground">换个关键词试试，或者清空搜索看全部课程。</p>
          <button
            type="button"
            onClick={() => setKeyword('')}
            className="mt-5 inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            清空搜索
          </button>
        </div>
      ) : (
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course, index) => (
            <Link
              key={course.slug}
              href={`/courses/view/?slug=${encodeURIComponent(course.slug)}`}
              className="group flex animate-fade-up flex-col overflow-hidden rounded-3xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-border/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-24px_rgba(15,23,42,0.35)] hover:ring-primary/30"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="relative block aspect-[16/9] overflow-hidden bg-secondary">
                {course.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.cover}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                ) : null}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
                  <Layers className="size-3" />
                  {course.scenes} 个场景
                </span>
              </span>

              <span className="flex flex-col gap-2 p-5">
                <strong className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
                  {course.title}
                </strong>
                {course.subtitle ? (
                  <span className="text-[13px] text-muted-foreground">{course.subtitle}</span>
                ) : null}
                <span className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground/80">
                  {course.slides ? <span>{course.slides} 幻灯片</span> : null}
                  {course.interactive ? (
                    <span className="inline-flex items-center gap-1">
                      <Puzzle className="size-3" />
                      {course.interactive} 互动
                    </span>
                  ) : null}
                  {course.quizzes ? <span>{course.quizzes} 测验</span> : null}
                  {course.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {course.duration}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          ))}

          {searching ? null : (
            <div
              className="hidden animate-fade-up sm:block"
              style={{ animationDelay: `${courses.length * 70}ms` }}
            >
              <ComingSoonCard />
            </div>
          )}
        </div>
      )}

      {source === 'static' && courses.length > 0 ? (
        <span className="hidden" aria-hidden />
      ) : null}
    </>
  );
}
