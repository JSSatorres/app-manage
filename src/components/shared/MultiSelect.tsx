"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string | null;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecciona",
  allLabel = "Todos",
  emptyMessage = "Sin opciones",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value.length) return allLabel;
    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label ?? placeholder;
    }
    return `${value.length} seleccionadas`;
  }, [value, options, allLabel, placeholder]);

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm hover:bg-muted/40 transition-colors min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed",
          !value.length && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="flex items-center gap-1 shrink-0 ml-2">
          {value.length > 0 && (
            <span
              role="button"
              aria-label="Limpiar selección"
              onClick={clearAll}
              className="rounded hover:bg-muted p-0.5"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="opacity-60" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3 text-center">{emptyMessage}</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const checked = value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-muted transition-colors",
                    checked && "bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked && <Check size={12} />}
                  </span>
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="text-xs text-muted-foreground shrink-0">{opt.hint}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
