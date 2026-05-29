"use client";

import { useMemo, useState } from "react";
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
import type { Documento } from "@/types/documentos";

interface DocumentoFormValue {
  titulo: string;
  categoriaDoc: string;
  driveFileId: string;
  sedeId: string;
}

interface DocumentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Documento | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: DocumentoFormValue) => Promise<void> | void;
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

  const defaultValue = useMemo<DocumentoFormValue>(() => ({
    titulo: initialValue?.titulo ?? "",
    categoriaDoc: initialValue?.categoriaDoc ?? "",
    driveFileId: initialValue?.driveFileId ?? "",
    sedeId: initialValue?.sedeId ?? "",
  }), [initialValue]);

  const [titulo, setTitulo] = useState("");
  const [categoriaDoc, setCategoriaDoc] = useState("");
  const [driveFileId, setDriveFileId] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [touched, setTouched] = useState(false);

  const currentTitulo = open ? defaultValue.titulo : titulo;
  const currentCategoria = open ? defaultValue.categoriaDoc : categoriaDoc;
  const currentDriveFileId = open ? defaultValue.driveFileId : driveFileId;
  const currentSedeId = open ? defaultValue.sedeId : sedeId;

  const isValid = currentTitulo.trim().length >= 2;

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
            <FormField label="Título" required error={touched && currentTitulo.trim().length < 2 ? "Mínimo 2 caracteres." : undefined}>
              <input className={inputClass} value={currentTitulo}
                onChange={(e) => { setTitulo(e.target.value); setTouched(true); }} disabled={loading} />
            </FormField>

            <FormField label="Categoría" hint="Ej: Reglamento, Plantilla...">
              <input className={inputClass} value={currentCategoria} placeholder="Ej: Reglamento, Plantilla..."
                onChange={(e) => setCategoriaDoc(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Drive File ID" hint="Pendiente de integrar Drive">
              <input className={inputClass} value={currentDriveFileId} placeholder="ID del archivo en Drive"
                onChange={(e) => setDriveFileId(e.target.value)} disabled={loading} />
            </FormField>

            <FormField label="Sede">
              <select className={inputClass} value={currentSedeId}
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
              titulo: currentTitulo.trim(), categoriaDoc: currentCategoria.trim(),
              driveFileId: currentDriveFileId.trim(), sedeId: currentSedeId,
            })}
            className="inline-flex items-center justify-center gap-[7px] rounded-[10px] bg-primary px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Guardar cambios"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
