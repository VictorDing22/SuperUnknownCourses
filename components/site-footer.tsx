import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import { PORTAL_LABEL, PORTAL_URL } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border/60">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground/70 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <EurasiaMark className="h-4 w-auto text-primary/70" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-semibold tracking-[0.18em] text-foreground/70">
              SuperUnknown
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="tracking-[0.16em]">超未知</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="hidden sm:inline">西安欧亚学院 · 基于 SuperUnknownMAIC 构建</span>
          <span className="sm:hidden">基于 SuperUnknownMAIC 构建</span>
          <a
            href={PORTAL_URL}
            {...(/^https?:/i.test(PORTAL_URL) ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            {PORTAL_LABEL}
            {/^https?:/i.test(PORTAL_URL) ? <ArrowUpRight className="size-3" /> : null}
          </a>
          <Link href="/" className="transition-colors hover:text-foreground">
            课程广场
          </Link>
        </div>
      </div>
    </footer>
  );
}
