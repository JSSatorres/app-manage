import { useState } from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SedeForm } from "@/components/sedes/SedeForm";
import type { CloneSedeSelection, CloneSedeResponse, CloneableSedeContent, Sede } from "@/types/sedes";

/**
 * Migración RHF + Zod (Task 3.1, Lote A). El schema (`createSedeSchema`, sin
 * `workspace_id`/`responsable_id`, que no gestiona este form) es la fuente de
 * verdad de la validación.
 */

vi.mock("@/hooks/useQuery", () => ({
  useQuery: () => ({ data: null, count: null, loading: false, errorMessage: null, refetch: vi.fn() }),
}));

const { pendingMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

const selection: CloneSedeSelection = {
  equipos: [],
  entrenadores: [],
  jugadores: [],
  sesiones: [],
  parametros: [],
  documentos: [],
};

const sedeOrigen: Sede = {
  id: "sede-origen",
  nombre: "Sede de origen",
  direccion: "Calle Origen",
  configuracionVisual: {},
  responsableId: null,
  workspaceId: "workspace-1",
  createdAt: "2026-08-08T10:00:00.000Z",
  updatedAt: "2026-08-08T10:00:00.000Z",
};

const cloneContent: CloneableSedeContent = {
  equipos: [{ id: "equipo-1", label: "Alevín", categoria: "Alevín" }],
  entrenadores: [{ id: "entrenador-1", label: "Ana Pérez" }],
  jugadores: [{ id: "jugador-1", label: "Mario Díaz" }],
  sesiones: [
    {
      id: "sesion-1",
      label: "12/08/2026",
      equipoId: "equipo-1",
      trainerIds: ["entrenador-1"],
    },
  ],
  entrenadorEquipos: [{ personId: "entrenador-1", equipoId: "equipo-1" }],
  jugadorEquipos: [{ personId: "jugador-1", equipoId: "equipo-1" }],
  parametros: [],
  documentos: [],
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function CloneableSedeForm({
  onCloneSubmit,
}: {
  onCloneSubmit: (
    value: { nombre: string; direccion: string },
    selection: CloneSedeSelection,
  ) => Promise<CloneSedeResponse | null>;
}) {
  const [isCloneMode, setIsCloneMode] = useState(false);
  const [sourceSedeId, setSourceSedeId] = useState<string | null>(null);
  const [cloneSelection, setCloneSelection] = useState(selection);

  return (
    <SedeForm
      open
      onOpenChange={vi.fn()}
      title="Nueva sede"
      workspaceId="workspace-1"
      sedes={[sedeOrigen]}
      isCloneMode={isCloneMode}
      onCloneModeChange={setIsCloneMode}
      sourceSedeId={sourceSedeId}
      onSourceSedeIdChange={setSourceSedeId}
      cloneableContent={cloneContent}
      cloneSelection={cloneSelection}
      onCloneSelectionChange={setCloneSelection}
      onCloneSubmit={onCloneSubmit}
      onSubmit={vi.fn()}
    />
  );
}

describe("SedeForm", () => {
  beforeEach(() => {
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
  });

  it("limita el formulario para que el cuerpo del diálogo sea la región desplazable", () => {
    render(
      <SedeForm open onOpenChange={vi.fn()} title="Nueva sede" onSubmit={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog", { name: "Nueva sede" });
    const form = dialog.querySelector("form");
    const body = dialog.querySelector('[data-slot="dialog-body"]');

    expect(form).toHaveClass("flex", "flex-1", "min-h-0", "flex-col");
    expect(body).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    expect(body).not.toContain(screen.getByRole("button", { name: /guardar cambios/i }));
  });

  it("no llama a onSubmit y muestra un error cuando el nombre está vacío", async () => {
    const onSubmit = vi.fn();
    render(
      <SedeForm open onOpenChange={vi.fn()} title="Nueva sede" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/nombre requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <SedeForm open onOpenChange={vi.fn()} title="Nueva sede" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede Test" } });
    fireEvent.change(getField(baseElement, "direccion"), { target: { value: "Calle Falsa 123" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ nombre: "Sede Test", direccion: "Calle Falsa 123" });
  });

  it("permite clonar desde una sede de origen y presenta el resumen", async () => {
    const onCloneSubmit = vi.fn().mockResolvedValue({
      sede: { id: "sede-nueva", nombre: "Sede clonada", direccion: "Calle nueva", responsable_id: null, configuracion_visual: {}, workspace_id: "workspace-1" },
      mappings: { equipos: {}, sesiones: {} },
      resumen: { equipos: 1, entrenadores: 0, jugadores: 0, sesiones: 0, parametros: 0, documentos: 0, ejercicios: 0 },
    });
    const { baseElement } = render(<CloneableSedeForm onCloneSubmit={onCloneSubmit} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /clonar contenido de otra sede/i }));
    fireEvent.change(await screen.findByLabelText("Sede de origen"), { target: { value: sedeOrigen.id } });
    fireEvent.click(screen.getByRole("checkbox", { name: /seleccionar equipos/i }));
    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede clonada" } });
    fireEvent.change(getField(baseElement, "direccion"), { target: { value: "Calle nueva" } });
    fireEvent.click(screen.getByRole("button", { name: /clonar sede/i }));

    await waitFor(() => expect(onCloneSubmit).toHaveBeenCalledWith(
      { nombre: "Sede clonada", direccion: "Calle nueva" },
      { ...selection, equipos: ["equipo-1"] },
    ));
    expect(await screen.findByText(/Sede clonada correctamente/)).toHaveTextContent("1 equipo");
  });

  it("envía directamente la selección normalizada al clonar una sesión", async () => {
    const onCloneSubmit = vi.fn().mockResolvedValue(null);
    const { baseElement } = render(
      <SedeForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sede"
        workspaceId="workspace-1"
        sedes={[sedeOrigen]}
        isCloneMode
        sourceSedeId={sedeOrigen.id}
        cloneableContent={cloneContent}
        cloneSelection={{ ...selection, sesiones: ["sesion-1"] }}
        onCloneSelectionChange={vi.fn()}
        onCloneSubmit={onCloneSubmit}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede clonada" } });
    fireEvent.click(screen.getByRole("button", { name: /clonar sede/i }));

    await waitFor(() => expect(onCloneSubmit).toHaveBeenCalledWith(
      { nombre: "Sede clonada", direccion: "" },
      {
        ...selection,
        equipos: ["equipo-1"],
        entrenadores: ["entrenador-1"],
        sesiones: ["sesion-1"],
      },
    ));
    expect(screen.queryByRole("alertdialog", { name: "Revisa las omisiones antes de clonar" })).not.toBeInTheDocument();
  });

  it("bloquea submitClone hasta que termina su única operación persistente", async () => {
    const cloneRequest = deferred<CloneSedeResponse | null>();
    const onCloneSubmit = vi.fn().mockReturnValue(cloneRequest.promise);
    const { baseElement } = render(
      <SedeForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sede"
        workspaceId="workspace-1"
        sedes={[sedeOrigen]}
        isCloneMode
        sourceSedeId={sedeOrigen.id}
        cloneableContent={cloneContent}
        cloneSelection={{ ...selection, sesiones: ["sesion-1"] }}
        onCloneSelectionChange={vi.fn()}
        onCloneSubmit={onCloneSubmit}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede clonada" } });
    const submitButton = screen.getByRole("button", { name: /clonar sede/i });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(onCloneSubmit).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);

    fireEvent.click(submitButton);
    expect(onCloneSubmit).toHaveBeenCalledTimes(1);

    cloneRequest.resolve(null);
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("cancela sin enviar ni modificar la selección de clonación", async () => {
    const onCloneSubmit = vi.fn().mockResolvedValue(null);
    const onOpenChange = vi.fn();
    const onCloneSelectionChange = vi.fn();
    const cloneSelection = { ...selection, sesiones: ["sesion-1"] };
    render(
      <SedeForm
        open
        onOpenChange={onOpenChange}
        title="Nueva sede"
        workspaceId="workspace-1"
        sedes={[sedeOrigen]}
        isCloneMode
        sourceSedeId={sedeOrigen.id}
        cloneableContent={cloneContent}
        cloneSelection={cloneSelection}
        onCloneSelectionChange={onCloneSelectionChange}
        onCloneSubmit={onCloneSubmit}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCloneSubmit).not.toHaveBeenCalled();
    expect(onCloneSelectionChange).not.toHaveBeenCalled();
    expect(cloneSelection).toEqual({ ...selection, sesiones: ["sesion-1"] });
  });

  it("exige una sede de origen y contenido seleccionado antes de clonar", async () => {
    const onCloneSubmit = vi.fn();
    const { baseElement } = render(<CloneableSedeForm onCloneSubmit={onCloneSubmit} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /clonar contenido de otra sede/i }));
    fireEvent.change(getField(baseElement, "nombre"), { target: { value: "Sede clonada" } });
    fireEvent.click(screen.getByRole("button", { name: /clonar sede/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Selecciona una sede de origen");
    expect(onCloneSubmit).not.toHaveBeenCalled();
  });

  it("no muestra la clonación al editar una sede", () => {
    render(
      <SedeForm
        open
        onOpenChange={vi.fn()}
        title="Editar sede"
        initialValue={sedeOrigen}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.queryByRole("checkbox", { name: /clonar contenido de otra sede/i })).not.toBeInTheDocument();
  });
});
