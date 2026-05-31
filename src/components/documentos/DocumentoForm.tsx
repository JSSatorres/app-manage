"use client";

import { useEffect, useMemo, useState } from "react";
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
import { MultiSelect, type MultiSelectOption } from "@/components/shared/MultiSelect";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useEntrenadoresLookupBySedes } from "@/hooks/useEntrenadoresLookupBySedes";
import { Upload, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidExternalUrl } from "@/lib/documentoLinks";
import type { Documento, DocumentoSourceType } from "@/types/documentos";

export interface DocumentoFormSubmit {
  mode: DocumentoSourceType;
  titulo: string;
  categoriaDoc: string;
  sedeIds: string[];
  equipoIds: string[];
  file: File | null;
  externalUrl: string;
  visibleEntrenadores: boolean;
  entrenadorIds: string[];
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

  const [mode, setMode] = useState<DocumentoSourceType>("file");
  const [titulo, setTitulo] = useState("");
  const [categoriaDoc, setCategoriaDoc] = useState("");
  const [sedeIds, setSedeIds] = useState<string[]>([]);
  const [equipoIds, setEquipoIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [visibleEntrenadores, setVisibleEntrenadores] = useState(false);
  const [entrenadorIds, setEntrenadorIds] = useState<string[]>([]);

  // Equipos y entrenadores disponibles según las sedes seleccionadas (many-to-many).

  const entrenadoresQuery = useEntrenadoresLookupBySedes(sedeIds);

  // Equipos disponibles según las sedes seleccionadas (many-to-many).
  const equiposQuery = useEquiposLookup(sedeIds);

  // Sincroniza el estado al abrir/cambiar el documento que se edita.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setMode(initialValue?.sourceType ?? "file");
      setExternalUrl(initialValue?.externalUrl ?? "");
      setTitulo(initialValue?.titulo ?? "");
      setCategoriaDoc(initialValue?.categoriaDoc ?? "");
      setSedeIds(
        initialValue?.sedeIds && initialValue.sedeIds.length > 0
          ? initialValue.sedeIds
          : initialValue?.sedeId
            ? [initialValue.sedeId]
            : [],
      );
      setEquipoIds(initialValue?.equipoIds ?? []);
      setVisibleEntrenadores(initialValue?.visibleEntrenadores ?? false);
      setEntrenadorIds(initialValue?.entrenadorIds ?? []);
      setFile(null);
      setTouched(false);
    });
  }, [open, initialValue]);

  const sedeOptions = useMemo<MultiSelectOption[]>(
    () => (sedesQuery.data ?? []).map((s) => ({ value: s.id, label: s.nombre })),
    [sedesQuery.data],
  );

  const equipoOptions = useMemo<MultiSelectOption[]>(
    () => (equiposQuery.data ?? []).map((e) => ({ value: e.id, label: e.nombre })),
    [equiposQuery.data],
  );

  const entrenadorOptions = useMemo<MultiSelectOption[]>(
    () =>
      (entrenadoresQuery.data ?? []).map((e) => ({
        value: e.id,
        label: [e.nombre, e.apellidos].filter(Boolean).join(" "),
      })),
    [entrenadoresQuery.data],
  );

  // Al cambiar las sedes, descarta equipos y entrenadores que ya no pertenezcan a ninguna sede elegida.
  useEffect(() => {
    if (equiposQuery.loading) return;
    const validIds = new Set((equiposQuery.data ?? []).map((e) => e.id));
    queueMicrotask(() => {
      setEquipoIds((prev) => {
        const next = prev.filter((id) => validIds.has(id));
        return next.length === prev.length ? prev : next;
      });
    });
  }, [equiposQuery.data, equiposQuery.loading]);

  useEffect(() => {
    if (entrenadoresQuery.loading) return;
    const validIds = new Set((entrenadoresQuery.data ?? []).map((e) => e.id));
    queueMicrotask(() => {
      setEntrenadorIds((prev) => {
        const next = prev.filter((id) => validIds.has(id));
        return next.length === prev.length ? prev : next;
      });
    });
  }, [entrenadoresQuery.data, entrenadoresQuery.loading]);

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
  const urlValida = isValidExternalUrl(externalUrl);
  const fileValido = isEditing || file != null;
  const isValid =
    tituloValido && (mode === "link" ? urlValida : fileValido);

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
            {/* Selector de origen: archivo subido o enlace externo. */}
            {!isEditing && (
              <div className="grid grid-cols-2 gap-1.5 rounded-[11px] bg-secondary/60 p-1">
                {([
                  { value: "file", label: "Archivo", icon: Upload },
                  { value: "link", label: "Enlace", icon: Link2 },
                ] as const).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setMode(tab.value);
                      setTouched(false);
                    }}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60",
                      mode === tab.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <tab.icon className="size-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {!isEditing && mode === "file" && (
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

            {mode === "link" && (
              <FormField
                label="Enlace (URL)"
                required
                hint="Pega un enlace de YouTube, Vimeo, Google Drive o cualquier web."
                error={touched && externalUrl.length > 0 && !urlValida ? "Introduce una URL válida (http/https)." : undefined}
              >
                <input
                  className={inputClass}
                  type="url"
                  inputMode="url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={externalUrl}
                  onChange={(e) => {
                    setExternalUrl(e.target.value);
                    setTouched(true);
                  }}
                  disabled={loading}
                />
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

            <FormField label="Sedes" hint="Puedes asociar el documento a varias sedes.">
              <MultiSelect
                className="w-full"
                options={sedeOptions}
                value={sedeIds}
                onChange={setSedeIds}
                placeholder="Selecciona sedes"
                allLabel="Sin sede (global)"
                emptyMessage="No hay sedes"
                disabled={loading || sedesQuery.loading}
                searchable
              />
            </FormField>

            <FormField
              label="Equipos"
              hint={
                sedeIds.length === 0
                  ? "Selecciona al menos una sede para elegir equipos."
                  : "Puedes asociar el documento a varios equipos."
              }
            >
              <MultiSelect
                className="w-full"
                options={equipoOptions}
                value={equipoIds}
                onChange={setEquipoIds}
                placeholder="Selecciona equipos"
                allLabel="Sin equipos"
                emptyMessage={sedeIds.length === 0 ? "Elige una sede primero" : "No hay equipos"}
                disabled={loading || equiposQuery.loading || sedeIds.length === 0}
                searchable
              />
            </FormField>

            {/* Visibilidad para entrenadores */}
            <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-secondary/30 p-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 cursor-pointer rounded accent-primary"
                  checked={visibleEntrenadores}
                  onChange={(e) => {
                    setVisibleEntrenadores(e.target.checked);
                    if (!e.target.checked) setEntrenadorIds([]);
                  }}
                  disabled={loading}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-foreground">
                    Visible para entrenadores
                  </span>
                  <span className="text-[11.5px] text-muted-foreground">
                    Si se activa, todos los entrenadores de las sedes podrán ver este documento.
                  </span>
                </div>
              </label>

              {!visibleEntrenadores && (
                <FormField
                  label="Entrenadores específicos"
                  hint={
                    sedeIds.length === 0
                      ? "Selecciona al menos una sede para elegir entrenadores."
                      : "Solo los entrenadores seleccionados podrán ver este documento."
                  }
                >
                  <MultiSelect
                    className="w-full"
                    options={entrenadorOptions}
                    value={entrenadorIds}
                    onChange={setEntrenadorIds}
                    placeholder="Selecciona entrenadores"
                    allLabel="Ninguno"
                    emptyMessage={sedeIds.length === 0 ? "Elige una sede primero" : "No hay entrenadores"}
                    disabled={loading || entrenadoresQuery.loading || sedeIds.length === 0}
                    searchable
                  />
                </FormField>
              )}
            </div>

            {(sedesQuery.errorMessage || equiposQuery.errorMessage || errorMessage) && (
              <p className="text-[12.5px] text-destructive">
                {sedesQuery.errorMessage ?? equiposQuery.errorMessage ?? errorMessage}
              </p>
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
              mode, titulo: titulo.trim(), categoriaDoc: categoriaDoc.trim(),
              sedeIds, equipoIds, file, externalUrl: externalUrl.trim(),
              visibleEntrenadores,
              entrenadorIds,
            })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? isEditing
                ? "Guardando…"
                : mode === "link"
                  ? "Guardando…"
                  : "Subiendo…"
              : isEditing
                ? "Guardar cambios"
                : mode === "link"
                  ? "Guardar enlace"
                  : "Subir documento"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
