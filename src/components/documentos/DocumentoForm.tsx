"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  workspaceId: string | null;
  initialValue?: Documento | null;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: DocumentoFormValue) => Promise<void> | void;
}

export function DocumentoForm({
  open,
  onOpenChange,
  title,
  workspaceId,
  initialValue,
  loading = false,
  errorMessage,
  onSubmit,
}: DocumentoFormProps) {
  const sedesQuery = useSedesLookup(workspaceId);

  const defaultValue = useMemo<DocumentoFormValue>(() => {
    return {
      titulo: initialValue?.titulo ?? "",
      categoriaDoc: initialValue?.categoriaDoc ?? "",
      driveFileId: initialValue?.driveFileId ?? "",
      sedeId: initialValue?.sedeId ?? "",
    };
  }, [initialValue]);

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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={currentTitulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && currentTitulo.trim().length < 2 && (
              <p className="text-sm text-destructive">El título debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoriaDoc">Categoría</Label>
            <Input
              id="categoriaDoc"
              value={currentCategoria}
              onChange={(e) => setCategoriaDoc(e.target.value)}
              disabled={loading}
              placeholder="Ej: Reglamento, Plantilla..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driveFileId">Drive file id</Label>
            <Input
              id="driveFileId"
              value={currentDriveFileId}
              onChange={(e) => setDriveFileId(e.target.value)}
              disabled={loading}
              placeholder="Pendiente de integrar Drive"
            />
          </div>

          <div className="space-y-2">
            <Label>Sede</Label>
            <Select
              value={currentSedeId}
              onValueChange={(v) => setSedeId(String(v ?? ""))}
              disabled={loading || sedesQuery.loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin sede (global)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Global</SelectItem>
                {(sedesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {sedesQuery.errorMessage && (
            <p className="text-sm text-destructive">{sedesQuery.errorMessage}</p>
          )}
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () =>
                onSubmit({
                  titulo: currentTitulo.trim(),
                  categoriaDoc: currentCategoria.trim(),
                  driveFileId: currentDriveFileId.trim(),
                  sedeId: currentSedeId,
                })
              }
              disabled={loading || !isValid}
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

