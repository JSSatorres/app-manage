"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { FormField, inputClass } from "@/components/shared/FormField";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { Upload, FileText } from "lucide-react";
import type { Documento } from "@/types/documentos";

export interface DocumentoFormSubmit {
  titulo: string;
  categoriaDoc: string;
  sedeId: string;
  file: File | null;
}

interface DocumentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Documento | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: DocumentoFormSubmit) => Promise<void> | void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentoForm({
  open,
  onOpenChange,
  title,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: DocumentoFormProps) {
  const sedesQuery = useSedesLookup();
  const isEditing = Boolean(initialValue);

  const [titulo, setTitulo] = useState("");
  const [categoriaDoc, setCategoriaDoc] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);

  // Sincroniza el estado al abrir/cambiar el documento que se edita.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setTitulo(initialValue?.titulo ?? "");
      setCategoriaDoc(initialValue?.categoriaDoc ?? "");
      setSedeId(initialValue?.sedeId ?? "");
      setFile(null);
      setTouched(false);
    });
  }, [open, initialValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    // Autorrellena el título con el nombre del archivo si está vacío.
    if (selected && titulo.trim().length === 0) {
      const base = selected.name.replace(/\.[^.]+$/, "");
      setTitulo(base);
    }
    setTouched(true);
  };

  const tituloValido = titulo.trim().length >= 2;
  const fileValido = isEditing || file != null;
  const isValid = tituloValido && fileValido;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex-1 min-w-0">
            <DialogTitle>{title}</DialogTitle>
            {initialValue && <DialogDescription>{initialValue.titulo}</DialogDescription>}
          </div>
          <DialogClose
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </DialogClose>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col gap-[16px]">
            {!isEditing && (
              <FormField
                label="Archivo"
                required
                hint="Word, Excel, PowerPoint, OpenOffice, PDF, imágenes… cualquier formato."
                error={touched && !file ? "Selecciona un archivo." : undefined}
              >
                <label
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-border px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/40"
                >
                  {file ? (
                    <>
                      <FileText className="size-6 text-primary" />
                      <span className="text-[13px] font-medium text-foreground">{file.name}</span>
                      <span className="text-[12px] text-muted-foreground">{formatBytes(file.size)}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="size-6 text-muted-foreground" />
                      <span className="text-[13px] font-medium text-foreground">Haz clic para subir un archivo</span>
                      <span className="text-[12px] text-muted-foreground">o arrástralo aquí</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>
              </FormField>
            )}

            {isEditing && initialValue?.fileName && (
              <div className="flex items-center gap-2 rounded-[10px] bg-secondary/50 px-3 py-2.5 text-[13px]">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-foreground">{initialValue.fileName}</span>
                {initialValue.sizeBytes != null && (
                  <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">
                    {formatBytes(initialValue.sizeBytes)}
                  </span>
                )}
              </div>
            )}

            <FormField label="Título" required error={touched && !tituloValido ? "Mínimo 2 caracteres." : undefined}>
              <input className={inputClass} value={titulo}
                onChange={(e) => { setTitulo(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <FormField label="Categoría" hint="Ej: Reglamento, Plantilla...">
              <input className={inputClass} value={categoriaDoc} placeholder="Ej: Reglamento, Plantilla..."
                onChange={(e) => setCategoriaDoc(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Sede">
              <select className={inputClass} value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                disabled={loading || sedesQuery.loading}>
                <option value="">Sin sede (global)</option>
                {(sedesQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </FormField>

            {(sedesQuery.errorMessage || errorMessage) && (
              <p className="text-[12.5px] text-destructive">{sedesQuery.errorMessage ?? errorMessage}</p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} disabled={loading}
            className="inline-flex items-center justify-center rounded-[10px] border border-border bg-transparent px-5 py-[11px] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60">
            Cancelar
          </button>
          <div className="flex-1" />
          <button type="button" disabled={loading || !isValid}
            onClick={() => onSubmit({
              titulo: titulo.trim(), categoriaDoc: categoriaDoc.trim(),
              sedeId, file,
            })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (isEditing ? "Guardando…" : "Subiendo…") : isEditing ? "Guardar cambios" : "Subir documento"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
