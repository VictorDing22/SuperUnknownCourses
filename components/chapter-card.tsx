import Link from 'next/link';
import { Atom, CircleHelp, Presentation, Users } from 'lucide-react';
import type { Chapter, ChapterType } from '@/lib/courses';
import { cn } from '@/lib/utils';

const TYPE_META: Record<
  ChapterType,
  { label: string; icon: typeof Presentation; badge: string; iconColor: string }
> = {
  slide: {
    label: '幻灯片',
    icon: Presentation,
    badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    iconColor: 'text-sky-500',
  },
  interactive: {
    label: '互动关卡',
    icon: Atom,
    badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    iconColor: 'text-violet-500',
  },
  quiz: {
    label: '测验',
    icon: CircleHelp,
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-500',
  },
  pbl: {
    label: '项目',
    icon: Users,
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-500',
  },
};

export function ChapterCard({ slug, chapter }: { slug: string; chapter: Chapter }) {
  const meta = TYPE_META[chapter.type];
  const Icon = meta.icon;

  return (
    <Link
      href={`/courses/${slug}/learn/#scene-${chapter.order}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border/70 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {chapter.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chapter.thumb}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className={cn('size-8', meta.iconColor)} />
          </div>
        )}
        <span className="absolute right-2.5 top-2.5 inline-flex size-6 items-center justify-center rounded-full bg-slate-950/60 text-[11px] font-semibold text-white backdrop-blur-sm">
          {String(chapter.order).padStart(2, '0')}
        </span>
        <span
          className={cn(
            'absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm dark:bg-slate-950/70',
            meta.badge,
          )}
        >
          <Icon className="size-3" />
          {meta.label}
        </span>
      </div>
      <div className="flex flex-1 items-start gap-2 p-3.5">
        <Icon className={cn('mt-0.5 size-4 shrink-0', meta.iconColor)} />
        <p className="text-[13px] font-medium leading-snug text-foreground/90">
          {chapter.title}
        </p>
      </div>
    </Link>
  );
}
