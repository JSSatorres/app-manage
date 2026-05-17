"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const toggle = (id: string, checked: boolean) => {
    if (checked) onChange(Array.from(new Set([...value, id])));
    else onChange(value.filter((v) => v !== id));
  };

  return (
    <div
      className={cn(
        "max-h-44 overflow-y-auto rounded-md border border-input p-2 space-y-1",
        className,
      )}
    >
      {options.map((opt) => {
        const checked = value.includes(opt.id);
        const inputId = `mcl-${opt.id}`;
        return (
          <div key={opt.id} className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(c) => toggle(opt.id, Boolean(c))}
            />
            <Label htmlFor={inputId} className="text-sm font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
