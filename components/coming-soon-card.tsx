import { Sparkles } from 'lucide-react';

export function ComingSoonCard() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 p-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Sparkles className="size-5" />
      </span>
      <p className="mt-4 text-sm font-medium text-foreground/80">更多课程正在制作中</p>
      <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-muted-foreground/70">
        下一门 SuperUnknown 工作室课程会出现在这里。
      </p>
    </div>
  );
}
