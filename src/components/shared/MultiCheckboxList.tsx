"use client";

import { cn } from "@/lib/utils";

export interface MultiCheckboxOption {
  id: string;
  label: string;
}

interface MultiCheckboxListProps {
  options: MultiCheckboxOption[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  emptyText?: string;
  className?: string;
}

export function MultiCheckboxList({
  options,
  value,
  onChange,
  disabled,
  emptyText = "No hay opciones disponibles.",
  className,
}: MultiCheckboxListProps) {
  if (!options.length) {
    return (
      <p className="text-[13.5px] text-muted-foreground py-[10px]">{emptyText}</p>
    );
  }

  const toggle = (id: string, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...value, id])));
    else onChange(value.filter((v) => v !== id));
  };

  return (
    <div
      className={cn(
        "max-h-[176px] overflow-y-auto rounded-[11px] border border-border bg-secondary/40",
        disabled && "opacity-60 pointer-events-none",
        className
      )}
    >
      {options.map((opt, idx) => {
        const checked = value.includes(opt.id);
        return (
          <label
            key={opt.id}
            className={cn(
              "flex w-full cursor-pointer items-center gap-[10px] px-[14px] py-[9px] transition-colors",
              "hover:bg-secondary/60",
              idx < options.length - 1 && "border-b border-border",
              checked && "bg-primary/5"
            )}
          >
            {/* Checkbox nativo estilizado con accent-color */}
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(e) => toggle(opt.id, e.target.checked)}
              className="size-4 rounded accent-primary shrink-0 cursor-pointer"
              style={{ accentColor: "var(--primary)" }}
            />
            <span className={cn(
              "text-[14px] font-medium leading-tight select-none",
              checked ? "text-foreground" : "text-foreground/80"
            )}>
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
