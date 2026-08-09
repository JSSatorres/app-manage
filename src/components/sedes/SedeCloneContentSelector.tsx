"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CloneSedeCategory,
  CloneSedeSelection,
  CloneableSedeContent,
  Sede,
} from "@/types/sedes";

interface SedeCloneContentSelectorProps {
  workspaceId: string;
  sedes: Sede[];
  sourceSedeId: string | null;
  content: CloneableSedeContent | null;
  selection: CloneSedeSelection;
  onSourceSedeIdChange: (sourceSedeId: string) => void;
  onSelectionChange: (selection: CloneSedeSelection) => void;
  loading?: boolean;
  errorMessage?: string | null;
  disabled?: boolean;
}

const categories: { key: CloneSedeCategory; label: string }[] = [
  { key: "equipos", label: "Equipos" },
  { key: "entrenadores", label: "Entrenadores" },
  { key: "jugadores", label: "Jugadores" },
  { key: "sesiones", label: "Sesiones" },
  { key: "parametros", label: "Parámetros" },
  { key: "documentos", label: "Documentos" },
];

const emptySelection: CloneSedeSelection = {
  equipos: [],
  entrenadores: [],
  jugadores: [],
  sesiones: [],
  parametros: [],
  documentos: [],
};

function normalizeSelection(
  selection: CloneSedeSelection,
  content: CloneableSedeContent,
): CloneSedeSelection {
  const idsForCategory = (category: CloneSedeCategory) => new Set(content[category].map((option) => option.id));
  const normalizeCategory = (category: CloneSedeCategory) => [
    ...new Set(selection[category].filter((id) => idsForCategory(category).has(id))),
  ];
  const sesiones = normalizeCategory("sesiones");
  return {
    equipos: [...new Set([...normalizeCategory("equipos"), ...content.sesiones.filter((sesion) => sesiones.includes(sesion.id)).map((sesion) => sesion.equipoId)])],
    entrenadores: [...new Set([
      ...normalizeCategory("entrenadores"),
      ...content.sesiones
        .filter((sesion) => sesiones.includes(sesion.id))
        .flatMap((sesion) => sesion.trainerIds),
    ])],
    jugadores: normalizeCategory("jugadores"),
    sesiones,
    parametros: normalizeCategory("parametros"),
    documentos: normalizeCategory("documentos"),
  };
}

export function SedeCloneContentSelector({
  workspaceId,
  sedes,
  sourceSedeId,
  content,
  selection,
  onSourceSedeIdChange,
  onSelectionChange,
  loading = false,
  errorMessage = null,
  disabled = false,
}: SedeCloneContentSelectorProps) {
  const sourceDescriptionId = useId();
  const sessionDependencyId = useId();
  const entrenadorDependencyId = useId();
  const implicitDependencies = useRef({ equipos: new Set<string>(), entrenadores: new Set<string>() });
  const [expandedCategories, setExpandedCategories] = useState<Set<CloneSedeCategory>>(
    () => new Set(categories.map((category) => category.key)),
  );
  const sourceSedes = sedes.filter((sede) => sede.workspaceId === workspaceId);
  const normalizedSelection = content ? normalizeSelection(selection, content) : emptySelection;
  const selectedCount = Object.values(normalizedSelection).reduce((total, ids) => total + ids.length, 0);
  const allOptionCount = content
    ? categories.reduce((total, category) => total + content[category.key].length, 0)
    : 0;
  const allSelected = allOptionCount > 0 && selectedCount === allOptionCount;
  const selectedSessions = content
    ? content.sesiones.filter((sesion) => normalizedSelection.sesiones.includes(sesion.id))
    : [];
  const dependentEntrenadorIds = new Set(selectedSessions.flatMap((sesion) => sesion.trainerIds));
  const dependentEquipoIds = new Set(selectedSessions.map((sesion) => sesion.equipoId));

  function emitSelection(nextSelection: CloneSedeSelection) {
    if (!content) return;
    onSelectionChange(normalizeSelection(nextSelection, content));
  }

  function toggleAll(checked: boolean) {
    if (!content) return;
    implicitDependencies.current = { equipos: new Set(), entrenadores: new Set() };
    emitSelection(
      checked
        ? {
          equipos: content.equipos.map((option) => option.id),
          entrenadores: content.entrenadores.map((option) => option.id),
          jugadores: content.jugadores.map((option) => option.id),
          sesiones: content.sesiones.map((option) => option.id),
          parametros: content.parametros.map((option) => option.id),
          documentos: content.documentos.map((option) => option.id),
        }
        : emptySelection,
    );
  }

  function toggleCategory(category: CloneSedeCategory, checked: boolean) {
    if (!content) return;
    if (category === "sesiones") {
      updateSessionSelection(checked ? content.sesiones.map((sesion) => sesion.id) : []);
      return;
    }
    emitSelection({
      ...normalizedSelection,
      [category]: checked ? content[category].map((option) => option.id) : [],
    });
  }

  function toggleOption(category: CloneSedeCategory, id: string, checked: boolean) {
    if (category === "sesiones") {
      updateSessionSelection(
        checked
          ? [...normalizedSelection.sesiones, id]
          : normalizedSelection.sesiones.filter((selectedId) => selectedId !== id),
      );
      return;
    }
    emitSelection({
      ...normalizedSelection,
      [category]: checked
        ? [...normalizedSelection[category], id]
        : normalizedSelection[category].filter((selectedId) => selectedId !== id),
    });
  }

  function updateSessionSelection(sessionIds: string[]) {
    if (!content) return;

    const nextSessionIds = [...new Set(sessionIds)];
    const currentSessionIds = new Set(selection.sesiones);
    const currentEquipoIds = new Set(selection.equipos);
    const currentEntrenadorIds = new Set(selection.entrenadores);
    const nextSessions = content.sesiones.filter((sesion) => nextSessionIds.includes(sesion.id));

    for (const sesion of nextSessions) {
      if (currentSessionIds.has(sesion.id)) continue;
      if (!currentEquipoIds.has(sesion.equipoId)) implicitDependencies.current.equipos.add(sesion.equipoId);
      for (const entrenadorId of sesion.trainerIds) {
        if (!currentEntrenadorIds.has(entrenadorId)) implicitDependencies.current.entrenadores.add(entrenadorId);
      }
    }

    const requiredEquipoIds = new Set(nextSessions.map((sesion) => sesion.equipoId));
    const requiredEntrenadorIds = new Set(nextSessions.flatMap((sesion) => sesion.trainerIds));
    const equipos = normalizedSelection.equipos.filter(
      (id) => !implicitDependencies.current.equipos.has(id) || requiredEquipoIds.has(id),
    );
    const entrenadores = normalizedSelection.entrenadores.filter(
      (id) => !implicitDependencies.current.entrenadores.has(id) || requiredEntrenadorIds.has(id),
    );

    for (const equipoId of implicitDependencies.current.equipos) {
      if (!requiredEquipoIds.has(equipoId)) implicitDependencies.current.equipos.delete(equipoId);
    }

    for (const entrenadorId of implicitDependencies.current.entrenadores) {
      if (!requiredEntrenadorIds.has(entrenadorId)) implicitDependencies.current.entrenadores.delete(entrenadorId);
    }

    emitSelection({ ...normalizedSelection, equipos, entrenadores, sesiones: nextSessionIds });
  }

  function toggleCategoryExpansion(category: CloneSedeCategory) {
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <section aria-labelledby="selector-contenido-clonable-title" className="space-y-4">
      <div className="space-y-1">
        <h3 id="selector-contenido-clonable-title" className="text-sm font-semibold">
          Contenido a clonar
        </h3>
        <p id={sourceDescriptionId} className="text-sm text-muted-foreground">
          Elige una sede de este espacio de trabajo como origen.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="sede-clone-source" className="text-sm font-medium">
          Sede de origen
        </label>
        <select
          id="sede-clone-source"
          value={sourceSedeId ?? ""}
          onChange={(event) => onSourceSedeIdChange(event.target.value)}
          aria-describedby={sourceDescriptionId}
          disabled={disabled}
          className="flex h-9 w-full rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Selecciona una sede</option>
          {sourceSedes.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          Cargando el contenido de la sede de origen…
        </p>
      )}

      {!loading && errorMessage && (
        <p role="alert" aria-live="assertive" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      {!loading && !errorMessage && content && allOptionCount === 0 && (
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          La sede de origen no tiene contenido disponible para clonar.
        </p>
      )}

      {!loading && !errorMessage && content && allOptionCount > 0 && (
        <div className="space-y-3">
          <p id={sessionDependencyId} className="text-sm text-muted-foreground">
            Al seleccionar una sesión se incluyen automáticamente su equipo y sus entrenadores.
          </p>
          <p id={entrenadorDependencyId} className="sr-only">
            Este elemento está incluido porque es necesario para una sesión seleccionada.
          </p>
          <div className="flex flex-col gap-2 rounded-none border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={allSelected}
                aria-checked={allSelected}
                aria-label="Seleccionar todo"
                disabled={disabled}
                onCheckedChange={toggleAll}
              />
              Seleccionar todo
            </div>
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {selectedCount} {selectedCount === 1 ? "elemento seleccionado" : "elementos seleccionados"}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {categories.map((category) => {
              const options = content[category.key];
              const categorySelection = normalizedSelection[category.key];
              const isSessions = category.key === "sesiones";
              const selectableCount = options.length;
              const categoryAllSelected = selectableCount > 0 && categorySelection.length === selectableCount;
              const categorySomeSelected = categorySelection.length > 0 && !categoryAllSelected;
              const categoryHasDependencies = (category.key === "equipos" && dependentEquipoIds.size > 0)
                || (category.key === "entrenadores" && dependentEntrenadorIds.size > 0);
              const categoryDisabled = disabled || categoryHasDependencies;
              const panelId = `sede-clone-${category.key}`;
              const isExpanded = expandedCategories.has(category.key);

              return (
                <section key={category.key} className="rounded-none border border-border" aria-labelledby={`${panelId}-title`}>
                  <div className="flex items-center gap-2 p-3">
                    <Checkbox
                      checked={categoryAllSelected}
                      indeterminate={categorySomeSelected}
                      aria-checked={categorySomeSelected ? "mixed" : categoryAllSelected}
                      aria-label={`Seleccionar ${category.key}`}
                      aria-describedby={category.key === "entrenadores" && categoryHasDependencies
                        ? entrenadorDependencyId
                          : undefined}
                      disabled={categoryDisabled || options.length === 0}
                      onCheckedChange={(checked) => toggleCategory(category.key, checked)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto flex-1 justify-between px-0 text-left"
                      aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} ${category.key}`}
                      aria-expanded={isExpanded}
                      aria-controls={isExpanded ? panelId : undefined}
                      onClick={() => toggleCategoryExpansion(category.key)}
                    >
                      <span id={`${panelId}-title`}>{category.label}</span>
                      <ChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div id={panelId} role="region" aria-labelledby={`${panelId}-title`} className="border-t border-border">
                      {options.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">No hay elementos disponibles.</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {options.map((option) => {
                            const isEntrenadorDependency = category.key === "entrenadores"
                              && dependentEntrenadorIds.has(option.id);
                            const isEquipoDependency = category.key === "equipos"
                              && dependentEquipoIds.has(option.id);
                            const optionDescription = "categoria" in option ? option.categoria : null;

                            return (
                              <li key={option.id} className="p-3">
                                <div className="flex items-start gap-2 text-sm">
                                  <Checkbox
                                    data-testid={isSessions ? `clone-session-${option.id}` : undefined}
                                    checked={categorySelection.includes(option.id)}
                                    aria-checked={categorySelection.includes(option.id)}
                                    aria-label={option.label}
                                    aria-describedby={isSessions
                                      ? sessionDependencyId
                                       : isEntrenadorDependency || isEquipoDependency
                                          ? entrenadorDependencyId
                                          : undefined}
                                    disabled={disabled || isEntrenadorDependency || isEquipoDependency}
                                    onCheckedChange={(checked) => toggleOption(category.key, option.id, checked)}
                                  />
                                  <span className="min-w-0">
                                    <span className="block font-medium">{option.label}</span>
                                    {optionDescription && (
                                      <span className="block text-xs text-muted-foreground">{optionDescription}</span>
                                    )}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
