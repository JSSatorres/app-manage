"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/shared/FormField";
import { MultiSelect, type MultiSelectOption } from "@/components/shared/MultiSelect";
import { useSedesLookup } from "@/hooks/useSedesLookup";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useEntrenadoresLookupBySedes } from "@/hooks/useEntrenadoresLookupBySedes";
import { Upload, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createDocumentoFileSchema,
  createDocumentoLinkSchema,
  updateDocumentoSchema,
} from "@/schemas/documento.schema";
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

/**
 * Superset de campos que gestiona RHF. Todos salvo `titulo` son opcionales
 * porque tienen `.default(...)` en `documentoCommonSchema`, y `file`/
 * `externalUrl` además varían según la variante de schema que resuelva el
 * `resolver` dinámico (uno de los tres de Task 2.2, según modo/edición): zod
 * descarta el campo que no pertenezca al schema activo.
 */
interface DocumentoFormFields {
  titulo: string;
  categoriaDoc?: string | null;
  sedeIds?: string[];
  equipoIds?: string[];
  visibleEntrenadores?: boolean;
  entrenadorIds?: string[];
  file?: File | null;
  externalUrl?: string | null;
}

// `workspaceId` lo inyecta el consumidor (workspace activo); `sedeId` (sede
// "principal") lo deriva el consumidor de `sedeIds[0]`. Ninguno lo recoge este form.
const documentoFileFormSchema = createDocumentoFileSchema.omit({ workspaceId: true, sedeId: true });
const documentoLinkFormSchema = createDocumentoLinkSchema.omit({ workspaceId: true, sedeId: true });
const documentoUpdateFormSchema = updateDocumentoSchema.omit({ workspaceId: true, sedeId: true });

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

  // Modo de origen: archivo subido o enlace externo. Decide qué variante del
  // schema (Task 2.2) valida el envío: archivo/enlace al crear, o la de
  // edición (permite ambos orígenes) al editar.
  const [mode, setMode] = useState<DocumentoSourceType>("file");

  // Resolver dinámico: el schema activo depende del modo (archivo/enlace) y de
  // si se está creando o editando. Las tres variantes comparten la base común
  // (Task 2.2) pero difieren en `file`/`externalUrl`, de ahí el cast: zod
  // valida igual, solo cambia qué claves exige según el modo actual.
  const resolver = useMemo(
    () =>
      zodResolver(
        isEditing
          ? documentoUpdateFormSchema
          : mode === "link"
            ? documentoLinkFormSchema
            : documentoFileFormSchema,
      ) as Resolver<DocumentoFormFields>,
    [isEditing, mode],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<DocumentoFormFields>({
    resolver,
    defaultValues: {
      titulo: "",
      categoriaDoc: "",
      sedeIds: [],
      equipoIds: [],
      visibleEntrenadores: false,
      entrenadorIds: [],
      file: null,
      externalUrl: "",
    },
  });

  // Equipos y entrenadores disponibles según las sedes seleccionadas (many-to-many).
  const sedeIds = useWatch({ control, name: "sedeIds" }) ?? [];
  const file = useWatch({ control, name: "file" });
  const visibleEntrenadores = useWatch({ control, name: "visibleEntrenadores" });

  const entrenadoresQuery = useEntrenadoresLookupBySedes(sedeIds);
  const equiposQuery = useEquiposLookup(sedeIds);

  // Sincroniza el estado al abrir/cambiar el documento que se edita.
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setMode(initialValue?.sourceType ?? "file");
      reset({
        titulo: initialValue?.titulo ?? "",
        categoriaDoc: initialValue?.categoriaDoc ?? "",
        sedeIds:
          initialValue?.sedeIds && initialValue.sedeIds.length > 0
            ? initialValue.sedeIds
            : initialValue?.sedeId
              ? [initialValue.sedeId]
              : [],
        equipoIds: initialValue?.equipoIds ?? [],
        visibleEntrenadores: initialValue?.visibleEntrenadores ?? false,
        entrenadorIds: initialValue?.entrenadorIds ?? [],
        file: null,
        // Al crear, "" (con `.url()` produce el mensaje "URL inválida" si se
        // envía vacío). Al editar, `null` si no hay URL (documentos de tipo
        // archivo): el schema de edición es nullable y `""` lo rechazaría.
        externalUrl: initialValue ? (initialValue.externalUrl ?? null) : "",
      });
    });
  }, [open, initialValue, reset]);

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

  // Al cambiar las sedes, descarta equipos que ya no pertenezcan a ninguna sede elegida.
  useEffect(() => {
    if (equiposQuery.loading) return;
    const validIds = new Set((equiposQuery.data ?? []).map((e) => e.id));
    queueMicrotask(() => {
      const prev = getValues("equipoIds") ?? [];
      const next = prev.filter((id) => validIds.has(id));
      if (next.length !== prev.length) setValue("equipoIds", next);
    });
  }, [equiposQuery.data, equiposQuery.loading, getValues, setValue]);

  // Ídem para entrenadores.
  useEffect(() => {
    if (entrenadoresQuery.loading) return;
    const validIds = new Set((entrenadoresQuery.data ?? []).map((e) => e.id));
    queueMicrotask(() => {
      const prev = getValues("entrenadorIds") ?? [];
      const next = prev.filter((id) => validIds.has(id));
      if (next.length !== prev.length) setValue("entrenadorIds", next);
    });
  }, [entrenadoresQuery.data, entrenadoresQuery.loading, getValues, setValue]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setValue("file", selected, { shouldValidate: true });
    // Autorrellena el título con el nombre del archivo si está vacío.
    if (selected && getValues("titulo").trim().length === 0) {
      const base = selected.name.replace(/\.[^.]+$/, "");
      setValue("titulo", base, { shouldValidate: true });
    }
  };

  const submit = handleSubmit((values) => {
    onSubmit({
      mode,
      titulo: values.titulo.trim(),
      categoriaDoc: (values.categoriaDoc ?? "").trim(),
      sedeIds: values.sedeIds ?? [],
      equipoIds: values.equipoIds ?? [],
      file: values.file ?? null,
      externalUrl: (values.externalUrl ?? "").trim(),
      visibleEntrenadores: values.visibleEntrenadores ?? false,
      entrenadorIds: values.entrenadorIds ?? [],
    });
  });

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

        <form onSubmit={submit}>
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
                      onClick={() => setMode(tab.value)}
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
                  error={errors.file?.message}
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
                    <Input
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
                  error={errors.externalUrl?.message}
                >
                  <Controller
                    control={control}
                    name="externalUrl"
                    render={({ field }) => (
                      <Input
                        type="url"
                        inputMode="url"
                        placeholder="https://www.youtube.com/watch?v=…"
                        name={field.name}
                        ref={field.ref}
                        value={field.value ?? ""}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={loading}
                      />
                    )}
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

              <FormField label="Título" required error={errors.titulo?.message}>
                <Input autoComplete="off" disabled={loading} {...register("titulo")} />
              </FormField>

              <FormField label="Categoría" hint="Ej: Reglamento, Plantilla...">
                <Input autoComplete="off" placeholder="Ej: Reglamento, Plantilla..." disabled={loading} {...register("categoriaDoc")} />
              </FormField>

              <FormField label="Sedes" hint="Puedes asociar el documento a varias sedes.">
                <Controller
                  control={control}
                  name="sedeIds"
                  render={({ field }) => (
                    <MultiSelect
                      className="w-full"
                      options={sedeOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Selecciona sedes"
                      allLabel="Sin sede (global)"
                      emptyMessage="No hay sedes"
                      disabled={loading || sedesQuery.loading}
                      searchable
                    />
                  )}
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
                <Controller
                  control={control}
                  name="equipoIds"
                  render={({ field }) => (
                    <MultiSelect
                      className="w-full"
                      options={equipoOptions}
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="Selecciona equipos"
                      allLabel="Sin equipos"
                      emptyMessage={sedeIds.length === 0 ? "Elige una sede primero" : "No hay equipos"}
                      disabled={loading || equiposQuery.loading || sedeIds.length === 0}
                      searchable
                    />
                  )}
                />
              </FormField>

              {/* Visibilidad para entrenadores */}
              <div className="flex flex-col gap-3 rounded-[10px] border border-border bg-secondary/30 p-3">
                <label className="flex cursor-pointer items-center gap-3">
                  <Controller
                    control={control}
                    name="visibleEntrenadores"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) setValue("entrenadorIds", []);
                        }}
                        disabled={loading}
                      />
                    )}
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
                    <Controller
                      control={control}
                      name="entrenadorIds"
                      render={({ field }) => (
                        <MultiSelect
                          className="w-full"
                          options={entrenadorOptions}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          placeholder="Selecciona entrenadores"
                          allLabel="Ninguno"
                          emptyMessage={sedeIds.length === 0 ? "Elige una sede primero" : "No hay entrenadores"}
                          disabled={loading || entrenadoresQuery.loading || sedeIds.length === 0}
                          searchable
                        />
                      )}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <div className="flex-1" />
            <Button type="submit" disabled={loading}>
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
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
