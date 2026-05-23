"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, Users } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { fetchEquiposByWorkspace, updateEquipoSede } from "@/services/equipos.service";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";

interface SedeFormValue {
  nombre: string;
  direccion: string;
}

interface SedeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initialValue?: Sede | null;
  workspaceId?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onSubmit: (value: SedeFormValue) => Promise<void> | void;
}

export function SedeForm({
  open,
  onOpenChange,
  title,
  initialValue,
  workspaceId,
  loading = false,
  errorMessage,
  onSubmit,
}: SedeFormProps) {
  const defaultValue = useMemo<SedeFormValue>(() => {
    return {
      nombre: initialValue?.nombre ?? "",
      direccion: initialValue?.direccion ?? "",
    };
  }, [initialValue]);

  const [nombre, setNombre] = useState(defaultValue.nombre);
  const [direccion, setDireccion] = useState(defaultValue.direccion);
  const [touched, setTouched] = useState(false);

  // Estado de vinculación de equipos: set de IDs que queremos vincular a esta sede
  const [equiposVinculados, setEquiposVinculados] = useState<Set<string>>(new Set());
  const [vinculandoId, setVinculandoId] = useState<string | null>(null);

  const isEditing = !!initialValue;

  const { data: todosEquipos, loading: loadingEquipos } = useQuery<Equipo[]>(
    () =>
      open && isEditing && workspaceId
        ? fetchEquiposByWorkspace(workspaceId)
        : Promise.resolve({ data: null, error: null }),
    [open, isEditing, workspaceId],
  );

  // Inicializar el set de vinculados con los equipos que ya tienen esta sede
  useEffect(() => {
    if (!open || !initialValue || !todosEquipos) return;
    const vinculados = new Set(
      todosEquipos.filter((e) => e.sedeId === initialValue.id).map((e) => e.id),
    );
    setEquiposVinculados(vinculados);
  }, [open, initialValue, todosEquipos]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNombre(defaultValue.nombre);
      setDireccion(defaultValue.direccion);
      setTouched(false);
    });
  }, [open, defaultValue]);

  const isValid = nombre.trim().length >= 2;

  async function toggleEquipo(equipo: Equipo) {
    if (!initialValue) return;
    setVinculandoId(equipo.id);
    const yaVinculado = equiposVinculados.has(equipo.id);
    const nuevoSedeId = yaVinculado ? null : initialValue.id;
    const { error } = await updateEquipoSede(equipo.id, nuevoSedeId);
    if (!error) {
      setEquiposVinculados((prev) => {
        const next = new Set(prev);
        if (yaVinculado) next.delete(equipo.id);
        else next.add(equipo.id);
        return next;
      });
    }
    setVinculandoId(null);
  }

  const equiposDeEstaSede = (todosEquipos ?? []).filter((e) =>
    equiposVinculados.has(e.id),
  );
  const equiposSinVincular = (todosEquipos ?? []).filter(
    (e) => !equiposVinculados.has(e.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setTouched(true);
              }}
              disabled={loading}
            />
            {touched && !isValid && (
              <p className="text-sm text-destructive">El nombre debe tener al menos 2 caracteres.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={loading}
            />
          </div>

          {isEditing && workspaceId && (
            <div className="space-y-3 pt-1">
              <Label className="flex items-center gap-1.5">
                <Users className="size-4" />
                Equipos vinculados
              </Label>

              {loadingEquipos ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Cargando equipos...
                </div>
              ) : (
                <>
                  {/* Equipos ya vinculados */}
                  {equiposDeEstaSede.length > 0 ? (
                    <div className="rounded-md border divide-y">
                      {equiposDeEstaSede.map((eq) => (
                        <div key={eq.id} className="flex items-center justify-between px-3 py-2">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{eq.nombre}</span>
                            {eq.categoria && (
                              <span className="text-xs text-muted-foreground">{eq.categoria}</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0 ml-2"
                            disabled={vinculandoId === eq.id}
                            onClick={() => toggleEquipo(eq)}
                          >
                            {vinculandoId === eq.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <X className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Ningún equipo vinculado a esta sede
                    </p>
                  )}

                  {/* Equipos disponibles para añadir */}
                  {equiposSinVincular.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Añadir equipo
                      </p>
                      <div className="rounded-md border divide-y">
                        {equiposSinVincular.map((eq) => (
                          <div key={eq.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm truncate">{eq.nombre}</span>
                              {eq.categoria && (
                                <span className="text-xs text-muted-foreground">{eq.categoria}</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 ml-2"
                              disabled={vinculandoId === eq.id}
                              onClick={() => toggleEquipo(eq)}
                            >
                              {vinculandoId === eq.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Plus className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={async () =>
                onSubmit({ nombre: nombre.trim(), direccion: direccion.trim() })
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
