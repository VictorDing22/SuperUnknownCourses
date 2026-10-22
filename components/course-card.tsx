import Link from 'next/link';
import { Atom, CircleHelp, Play, Presentation } from 'lucide-react';
import type { Course } from '@/lib/courses';

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-border/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-24px_rgba(15,23,42,0.35)] hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.cover}
          alt={course.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent opacity-80" />

        <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            <Presentation className="size-3.5" />
            {course.stats.scenes} 个场景
          </span>
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm transition-transform duration-300 group-hover:scale-110 dark:bg-white/85">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-semibold leading-snug tracking-tight text-foreground">
          {course.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {course.subtitle}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Presentation className="size-3.5 text-sky-500" />
            {course.stats.slides} 幻灯片
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Atom className="size-3.5 text-violet-500" />
            {course.stats.interactive} 互动
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CircleHelp className="size-3.5 text-amber-500" />
            {course.stats.quizzes} 测验
          </span>
        </div>
      </div>
    </Link>
  );
}
