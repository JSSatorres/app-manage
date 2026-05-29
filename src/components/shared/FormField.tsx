"use client";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function FormField({
  label,
  required,
  hint,
  error,
  className,
  children,
  fullWidth,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-[7px] min-w-0", fullWidth && "col-span-2", className)}>
      <label className="text-[12.5px] font-semibold text-foreground/70 leading-none">
        {label}
        {required && <span className="ml-[2px] text-primary">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-[11.5px] text-destructive">{error}</p>
      )}
    </div>
  );
}

/* Input estilizado del nuevo design system */
export const inputClass = cn(
  "w-full rounded-[11px] border border-border bg-secondary/60 px-[13px] py-[11px]",
  "text-[14px] text-foreground placeholder:text-muted-foreground",
  "outline-none transition-all",
  "focus:border-primary/60 focus:bg-background focus:ring-2 focus:ring-primary/10",
  "disabled:opacity-60 disabled:cursor-not-allowed"
);

/* Sección separadora dentro del form-grid */
export function FormSection({ label }: { label: string }) {
  return (
    <div className="col-span-2 mt-[6px] border-t border-border pt-[16px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
