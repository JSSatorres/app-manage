import { cn } from "@/lib/utils";

export function Logo({
  className,
  withKicker = false,
  invert = false,
}: {
  className?: string;
  withKicker?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary">
        <svg viewBox="0 0 24 24" fill="none" className="size-4 text-white" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="leading-none">
        <span className={cn("text-[16px] font-semibold tracking-[-0.02em]", invert ? "text-white" : "text-foreground")}>SportApp</span>
        {withKicker && <span className={cn("block text-[9px] font-semibold uppercase tracking-[0.18em]", invert ? "text-white/60" : "text-muted-foreground")}>Un producto de Satorus</span>}
      </div>
    </div>
  );
}
