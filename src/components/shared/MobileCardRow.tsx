"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCardRowProps {
  icon: LucideIcon;
  title: string;
  meta?: string;
  badge?: React.ReactNode;
  iconClassName?: string;
  iconWrapClassName?: string;
  showChevron?: boolean;
}

export function MobileCardRow({
  icon: Icon,
  title,
  meta,
  badge,
  iconClassName,
  iconWrapClassName,
  showChevron = true,
}: MobileCardRowProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={cn(
          "size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0",
          iconWrapClassName,
        )}
      >
        <Icon size={16} className={cn("text-primary", iconClassName)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {meta && (
          <p className="text-xs text-muted-foreground truncate">{meta}</p>
        )}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
      {showChevron && (
        <ChevronRight size={16} className="text-muted-foreground shrink-0" />
      )}
    </div>
  );
}
