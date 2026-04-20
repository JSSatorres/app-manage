"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  text?: string;
}

export function LoadingSpinner({
  className,
  size = 22,
  text,
}: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5", className)}>
      <Loader2 className="animate-spin text-primary/60" size={size} />
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  );
}
