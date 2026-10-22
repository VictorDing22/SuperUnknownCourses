import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserChip } from '@/components/user-chip';
import { PortalLink } from '@/components/portal-link';
import { ManageLink } from '@/components/manage-link';
import { MyCoursesLink } from '@/components/my-courses-link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card/70 py-1.5 pl-2 pr-2.5 shadow-sm backdrop-blur transition-colors hover:border-primary/25 hover:bg-card sm:gap-2.5 sm:pr-3"
          aria-label="西安欧亚学院 · SuperUnknown 课程广场"
        >
          <EurasiaMark className="h-5 w-auto shrink-0 text-primary sm:h-6" />
          <span className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="whitespace-nowrap text-[12.5px] font-semibold tracking-tight text-foreground/85 sm:text-[13px]">
              西安欧亚学院
            </span>
            <span className="hidden whitespace-nowrap text-[10px] tracking-[0.12em] text-muted-foreground/60 lg:inline">
              XI&apos;AN EURASIA UNIVERSITY
            </span>
          </span>
          <span className="hidden h-4 w-px shrink-0 bg-border min-[360px]:block" />
          <span className="hidden whitespace-nowrap text-[11px] font-medium text-primary min-[360px]:inline">
            课程广场
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="主导航">
          <MyCoursesLink className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:text-sm" />
          <ManageLink className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:text-sm" />
          <PortalLink className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3 sm:text-sm" />
          <UserChip className="ml-1 inline-flex items-center" />
          <ThemeToggle className="ml-0.5 sm:ml-1" />
        </nav>
      </div>
    </header>
  );
}
