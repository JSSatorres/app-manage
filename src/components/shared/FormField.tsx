"use client";

import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
  /** Id explícito del campo. Si no se pasa, se genera uno único con `useId()`. */
  id?: string;
}

export function FormField({
  label,
  required,
  hint,
  error,
  className,
  children,
  fullWidth,
  id,
}: FormFieldProps) {
  const generatedId = useId();
  const defaultId = id ?? `field-${generatedId}`;

  // Si el hijo es un único elemento (Input, Textarea, <select>...) sin `id`
  // propio, le inyectamos el generado para poder asociarlo al label vía
  // `htmlFor`. Si ya trae un `id` explícito, se respeta y el label apunta a
  // ese. Si es un componente compuesto (p. ej. envuelto en `Controller`) que
  // no reenvía `id` a un elemento con foco, el `id` no tendrá efecto visual
  // pero tampoco rompe nada: sigue siendo retrocompatible con los 8 forms
  // existentes.
  const childElement = isValidElement<{ id?: string }>(children) ? children : null;
  const fieldId = childElement?.props.id ?? defaultId;
  const child = childElement ? cloneElement(childElement, { id: fieldId }) : children;

  return (
    <div className={cn("flex flex-col gap-[7px] min-w-0", fullWidth && "col-span-2", className)}>
      <label
        htmlFor={fieldId}
        className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70 leading-none"
      >
        {label}
        {required && <span className="ml-[2px] text-primary">*</span>}
      </label>
      {child}
      {hint && !error && (
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="border-l-2 border-destructive pl-2 text-[11.5px] text-destructive">{error}</p>
      )}
    </div>
  );
}

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
