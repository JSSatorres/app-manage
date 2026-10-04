"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { colorForText } from "@/lib/sectionTones";
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
  // Sin color explícito, el monograma toma un color estable derivado del título.
  const tint = iconColor ?? colorForText(title.toLowerCase());

  return (
    <div className="flex flex-col">
      {/* Fila principal: monograma + info + badge */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconWrapClassName
          )}
          style={{
            background: `color-mix(in srgb, ${tint} 13%, var(--card))`,
            color: `color-mix(in srgb, ${tint} 75%, var(--foreground))`,
          }}
        >
          <Icon size={18} className={iconClassName} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-[14.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
            {title}
          </p>
          {meta && (
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{meta}</p>
          )}
        </div>

        {badge && <div className="shrink-0">{badge}</div>}
        {showChevron && <ChevronRight size={18} className="text-muted-foreground shrink-0" />}
      </div>

      {/* Stats adicionales */}
      {stats && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[52px]">
          {stats}
        </div>
      )}

      {/* Acciones */}
      {actions && (
        <div className="mt-2.5 flex items-center gap-2 pl-[52px]">
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
    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground/80">
      <Icon size={14} className="text-muted-foreground" />
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
        "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3",
        "text-[13px] font-medium transition-colors active:scale-[0.98]",
        danger
          ? "border-destructive/20 bg-destructive/8 text-destructive"
          : "border-border bg-card text-foreground shadow-card hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}
