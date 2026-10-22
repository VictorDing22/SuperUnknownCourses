import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EurasiaMark } from '@/components/eurasia-mark';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <EurasiaMark className="h-7 w-auto" />
      </span>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground">
          SUPERUNKNOWN
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          没有找到这个页面
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">课程可能还没发布，或者链接写错了。</p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <ArrowLeft className="size-4" />
        返回课程广场
      </Link>
    </div>
  );
}
