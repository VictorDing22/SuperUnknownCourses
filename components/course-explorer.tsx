'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { CourseCard } from '@/components/course-card';
import { ComingSoonCard } from '@/components/coming-soon-card';
import type { Course } from '@/lib/courses';

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
 * 学生和教师看到的是同一份课程列表，只按关键词过滤，不做角色区分。
 */
export function CourseExplorer({ courses }: { courses: Course[] }) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    if (!keyword.trim()) return courses;
    return courses.filter((course) =>
      fuzzyMatch(
        [course.title, course.subtitle, course.description, ...(course.tags ?? []), course.level]
          .filter(Boolean)
          .join(' '),
        keyword,
      ),
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
            <div
              key={course.slug}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <CourseCard course={course} />
            </div>
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
    </>
  );
}
