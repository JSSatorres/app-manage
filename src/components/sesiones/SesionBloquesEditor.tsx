"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizarOrdenBloques } from "@/lib/sesionBloques";
import type { Documento } from "@/types/documentos";
import type { Ejercicio } from "@/types/ejercicios";
import type { SesionBloqueDraft } from "@/types/sesion-bloques";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { SesionBloqueResourcePicker } from "./SesionBloqueResourcePicker";

interface SesionBloquesEditorProps {
  bloques: SesionBloqueDraft[];
  ejercicios: Ejercicio[];
  documentos: Documento[];
  disabled?: boolean;
  showErrors?: boolean;
  onChange: (bloques: SesionBloqueDraft[]) => void;
}

function createDraftId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `bloque-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBlockErrors(bloque: SesionBloqueDraft) {
  return {
    titulo: !bloque.titulo.trim() ? "El título es obligatorio." : null,
    duracion:
      !Number.isInteger(bloque.duracionMinutos) || (bloque.duracionMinutos ?? 0) <= 0
        ? "La duración debe ser positiva."
        : null,
    ejercicio: !bloque.ejercicioId ? "Selecciona un ejercicio." : null,
  };
}

export function SesionBloquesEditor({
  bloques,
  ejercicios,
  documentos,
  disabled = false,
  showErrors = false,
  onChange,
}: SesionBloquesEditorProps) {
  function updateBlock(id: string, patch: Partial<SesionBloqueDraft>) {
    onChange(
      bloques.map((bloque) => (bloque.id === id ? { ...bloque, ...patch } : bloque)),
    );
  }

  function addBlock() {
    onChange(
      normalizarOrdenBloques([
        ...bloques,
        {
          id: createDraftId(),
          titulo: "",
          duracionMinutos: null,
          ejercicioId: null,
          documentoId: null,
          orden: bloques.length + 1,
        },
      ]),
    );
  }

  function removeBlock(id: string) {
    if (bloques.length <= 1) return;
    onChange(normalizarOrdenBloques(bloques.filter((bloque) => bloque.id !== id)));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= bloques.length) return;
    const next = [...bloques];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(normalizarOrdenBloques(next));
  }

  return (
    <section className="space-y-3 sm:space-y-4" aria-label="Bloques de sesión">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-base">Bloques</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBlock}
          disabled={disabled}
        >
          <Plus />
          Añadir bloque
        </Button>
      </div>

      {bloques.length === 0 && (
        <p className="text-sm text-muted-foreground">Añade al menos un bloque para definir la sesión.</p>
      )}

      <div className="space-y-3">
        {bloques.map((bloque, index) => {
          const errors = getBlockErrors(bloque);
          const blockNumber = index + 1;
          return (
            <fieldset key={bloque.id} className="space-y-3 border bg-background p-3">
              <legend className="px-1 text-sm font-semibold">Bloque {blockNumber}</legend>
              <div className="flex flex-wrap items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Subir bloque ${blockNumber}`}
                  onClick={() => moveBlock(index, -1)}
                  disabled={disabled || index === 0}
                >
                  <ChevronUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Bajar bloque ${blockNumber}`}
                  onClick={() => moveBlock(index, 1)}
                  disabled={disabled || index === bloques.length - 1}
                >
                  <ChevronDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={`Eliminar bloque ${blockNumber}`}
                  onClick={() => removeBlock(bloque.id)}
                  disabled={disabled || bloques.length <= 1}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`bloque-${bloque.id}-titulo`}>Título del bloque {blockNumber}</Label>
                  <Input
                    id={`bloque-${bloque.id}-titulo`}
                    value={bloque.titulo}
                    onChange={(event) => updateBlock(bloque.id, { titulo: event.target.value })}
                    disabled={disabled}
                    aria-invalid={showErrors && !!errors.titulo}
                    aria-describedby={errors.titulo ? `bloque-${bloque.id}-titulo-error` : undefined}
                  />
                  {showErrors && errors.titulo && (
                    <p id={`bloque-${bloque.id}-titulo-error`} className="text-sm text-destructive">
                      {errors.titulo}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`bloque-${bloque.id}-duracion`}>Duración (min) del bloque {blockNumber}</Label>
                  <Input
                    id={`bloque-${bloque.id}-duracion`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={bloque.duracionMinutos ?? ""}
                    onChange={(event) =>
                      updateBlock(bloque.id, {
                        duracionMinutos: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                    disabled={disabled}
                    aria-invalid={showErrors && !!errors.duracion}
                    aria-describedby={errors.duracion ? `bloque-${bloque.id}-duracion-error` : undefined}
                  />
                  {showErrors && errors.duracion && (
                    <p id={`bloque-${bloque.id}-duracion-error`} className="text-sm text-destructive">
                      {errors.duracion}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Ejercicio del bloque {blockNumber}</Label>
                <Select
                  value={bloque.ejercicioId ?? "none"}
                  onValueChange={(value) => updateBlock(bloque.id, { ejercicioId: value === "none" ? null : value ?? null })}
                  disabled={disabled}
                >
                  <SelectTrigger
                    aria-label={`Ejercicio del bloque ${blockNumber}`}
                    aria-invalid={showErrors && !!errors.ejercicio}
                  >
                    <SelectValue placeholder="Selecciona un ejercicio">
                      {(value) =>
                        value === "none"
                          ? "Selecciona un ejercicio"
                          : ejercicios.find((ejercicio) => ejercicio.id === value)?.titulo ?? "Selecciona un ejercicio"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecciona un ejercicio</SelectItem>
                    {ejercicios.map((ejercicio) => (
                      <SelectItem key={ejercicio.id} value={ejercicio.id}>
                        {ejercicio.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showErrors && errors.ejercicio && (
                  <p className="text-sm text-destructive">{errors.ejercicio}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Recurso</Label>
                <SesionBloqueResourcePicker
                  bloqueOrden={blockNumber}
                  documentoId={bloque.documentoId}
                  documentos={documentos}
                  disabled={disabled}
                  onChange={(documentoId) => updateBlock(bloque.id, { documentoId })}
                />
              </div>
            </fieldset>
          );
        })}
      </div>
    </section>
  );
}
