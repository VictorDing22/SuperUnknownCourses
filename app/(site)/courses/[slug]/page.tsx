import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock,
  ExternalLink,
  Play,
  Presentation,
  UserRound,
} from 'lucide-react';
import { ChapterCard } from '@/components/chapter-card';
import { getAllCourses, getCourse } from '@/lib/courses';
import { IS_CAMPUS } from '@/lib/site';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllCourses().map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: '课程不存在' };

  return {
    title: course.title,
    description: course.description,
    openGraph: {
      title: course.title,
      description: course.description,
      images: [course.cover],
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = getCourse(slug);

  if (!course) notFound();

  const learnHref = `/courses/${course.slug}/learn/`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="面包屑">
        <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          课程广场
        </Link>
        <ChevronRight className="size-3.5 opacity-40" />
        <span className="truncate text-foreground/80">{course.title}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <Link
          href={learnHref}
          className="group relative block aspect-video overflow-hidden rounded-3xl bg-slate-900 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] ring-1 ring-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`播放课程：${course.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.cover}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/15 to-slate-950/5" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-xl transition-transform duration-300 group-hover:scale-105">
              <Play className="ml-1 size-6 fill-current" />
            </span>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
            <span className="text-xs text-white/80">
              {course.stats.scenes} 个场景 · {course.stats.interactive} 个互动关卡
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm">
              点击播放
            </span>
          </div>
        </Link>

        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.07] px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            SUPERUNKNOWN 工作室课程
          </span>

          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{course.subtitle}</p>

          <p className="mt-5 text-sm leading-7 text-muted-foreground">{course.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {course.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Presentation className="size-3.5 text-sky-500" />
                场景
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {course.stats.scenes}
              </dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Atom className="size-3.5 text-violet-500" />
                互动关卡
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {course.stats.interactive}
              </dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CircleHelp className="size-3.5 text-amber-500" />
                测验
              </dt>
              <dd className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                {course.stats.quizzes}
              </dd>
            </div>
            <div className="rounded-2xl bg-card p-3.5 ring-1 ring-border/70">
              <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="size-3.5 text-emerald-500" />
                时长
              </dt>
              <dd className="mt-1 text-sm font-semibold tracking-tight text-foreground">
                {course.duration}
              </dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={learnHref}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Play className="size-4 fill-current" />
              开始学习
            </Link>
            <Link
              href={learnHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-card px-4 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-4" />
              新窗口打开
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {course.author}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              更新于 {course.updatedAt}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              {IS_CAMPUS ? '校内课程 · 需登录' : '离线课程 · 无需登录'}
            </span>
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">课程内容</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {course.stats.scenes} 个场景 · 点击任意章节直接跳到对应位置
            </p>
          </div>
          <Link
            href={learnHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            从第一页开始
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {course.chapters.map((chapter) => (
            <ChapterCard key={chapter.order} slug={course.slug} chapter={chapter} />
          ))}
        </div>
      </section>
    </div>
  );
}
