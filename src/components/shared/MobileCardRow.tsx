"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCardRowProps {
  icon: LucideIcon;
  title: string;
  meta?: string;
  badge?: React.ReactNode;
  iconColor?: string;
  iconClassName?: string;
  iconWrapClassName?: string;
  stats?: React.ReactNode;
  actions?: React.ReactNode;
  showChevron?: boolean;
}

export function MobileCardRow({
  icon: Icon,
  title,
  meta,
  badge,
  iconColor,
  iconClassName,
  iconWrapClassName,
  stats,
  actions,
  showChevron = false,
}: MobileCardRowProps) {
  return (
    <div className="flex flex-col">
      {/* Fila principal: monograma + info + badge */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "size-[42px] shrink-0 rounded-[11px] flex items-center justify-center",
            iconWrapClassName
          )}
          style={
            iconColor
              ? {
                  background: `color-mix(in srgb, ${iconColor} 13%, var(--card))`,
                  color: `color-mix(in srgb, ${iconColor} 62%, var(--foreground))`,
                }
              : undefined
          }
        >
          <Icon
            size={18}
            className={cn(!iconColor && "text-primary", iconClassName)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground leading-tight">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{meta}</p>
          )}
        </div>

        {badge && <div className="shrink-0">{badge}</div>}
        {showChevron && <ChevronRight size={18} className="text-muted-foreground shrink-0" />}
      </div>

      {/* Stats adicionales */}
      {stats && (
        <div className="mt-[11px] flex flex-wrap gap-x-[18px] gap-y-[6px]">
          {stats}
        </div>
      )}

      {/* Acciones */}
      {actions && (
        <div className="mt-[14px] pt-[14px] border-t border-border flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/* Componente auxiliar para stats dentro de la tarjeta */
export function CardStat({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-[6px] text-[13px] font-medium text-foreground/80">
      <Icon size={15} className="text-muted-foreground" />
      {children}
    </span>
  );
}

/* Botón de acción dentro de una tarjeta móvil */
export function CardAction({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-[7px] rounded-[10px] border px-[14px] py-[10px]",
        "text-[13.5px] font-semibold transition-colors active:scale-[.98] min-h-[42px]",
        danger
          ? "border-destructive/30 bg-destructive/6 text-destructive"
          : "border-border bg-card text-foreground hover:bg-secondary/60"
      )}
    >
      {children}
    </button>
  );
}
