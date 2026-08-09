import type { ComponentProps, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SedesListView } from "@/components/sedes/SedesListView";

const sedeCentral = {
  id: "sede-central",
  nombre: "Central",
};

const { canMutate, sedesState, useSedesMock } = vi.hoisted(() => ({
  canMutate: vi.fn(),
  useSedesMock: vi.fn(),
  sedesState: {
    data: [] as { id: string; nombre: string }[],
    loading: false,
    errorMessage: null as string | null,
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/shared/PageHeader", () => ({
  PageHeader: ({ title, action }: { title: string; action?: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
}));

vi.mock("@/components/shared/ConfirmDialog", () => ({
  ConfirmDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div role="dialog">{title}</div> : null,
}));

vi.mock("@/components/sedes/SedeForm", () => ({
  SedeForm: ({
    open,
    title,
    onSubmit,
    onCloneSubmit,
    onCloneModeChange,
    onSourceSedeIdChange,
    onCloneSelectionChange,
  }: {
    open: boolean;
    title: string;
    onSubmit: (value: { nombre: string; direccion: string }) => void;
    onCloneSubmit?: (
      value: { nombre: string; direccion: string },
      selection: { equipos: string[]; entrenadores: string[]; jugadores: string[]; sesiones: string[]; parametros: string[]; documentos: string[] },
    ) => void;
    onCloneModeChange?: (value: boolean) => void;
    onSourceSedeIdChange?: (value: string) => void;
    onCloneSelectionChange?: (value: { equipos: string[]; entrenadores: string[]; jugadores: string[]; sesiones: string[]; parametros: string[]; documentos: string[] }) => void;
  }) =>
    open ? (
      <div role="dialog">
        {title}
        <button type="button" onClick={() => onSubmit({ nombre: "Sede simple", direccion: "Calle simple" })}>Crear sede simple</button>
        {onCloneSubmit && (
          <>
            <button type="button" onClick={() => onCloneModeChange?.(true)}>Activar clonación</button>
            <button type="button" onClick={() => onSourceSedeIdChange?.("sede-origen")}>Elegir origen</button>
            <button type="button" onClick={() => onCloneSelectionChange?.({ equipos: ["equipo-1"], entrenadores: [], jugadores: [], sesiones: [], parametros: [], documentos: [] })}>Seleccionar contenido</button>
            <button type="button" onClick={() => onCloneSubmit({ nombre: "Sede clonada", direccion: "Calle clonada" }, { equipos: [], entrenadores: [], jugadores: ["jugador-confirmado"], sesiones: [], parametros: [], documentos: [] })}>Confirmar clonación</button>
          </>
        )}
      </div>
    ) : null,
}));

vi.mock("@/components/sedes/SedeAccordionRow", () => ({
  SedeAccordionRow: ({ sede, actions }: { sede: typeof sedeCentral; actions: ReactNode }) => (
    <article>
      <h2>{sede.nombre}</h2>
      {actions}
    </article>
  ),
}));

vi.mock("@/components/equipos/EquipoForm", () => ({ EquipoForm: () => null }));
vi.mock("@/components/entrenadores/EntrenadorForm", () => ({ EntrenadorForm: () => null }));
vi.mock("@/components/jugadores/JugadorForm", () => ({ JugadorForm: () => null }));
vi.mock("@/components/sesiones/SesionForm", () => ({ SesionForm: () => null }));

vi.mock("@/hooks/useSedes", () => ({
  useSedes: useSedesMock,
}));

function defaultSedesHook() {
  return {
    ...sedesState,
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    cloneOne: vi.fn(),
    createLoading: false,
    updateLoading: false,
    createErrorMessage: null,
    updateErrorMessage: null,
    refetch: vi.fn(),
  };
}

useSedesMock.mockImplementation(defaultSedesHook);
vi.mock("@/hooks/useEquipos", () => ({ useEquipos: () => ({}) }));
vi.mock("@/hooks/useEntrenadores", () => ({ useEntrenadores: () => ({}) }));
vi.mock("@/hooks/useJugadores", () => ({ useJugadores: () => ({}) }));
vi.mock("@/hooks/useSesiones", () => ({
  useSesiones: () => ({ updateOne: vi.fn(), updateLoading: false, updateErrorMessage: null }),
}));
vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({
    refresh: vi.fn(),
    activeWorkspace: { id: "workspace-1", sedes: [] },
    rol: "admin",
  }),
}));
vi.mock("@/lib/permisos", () => ({ can: canMutate }));

afterEach(() => {
  cleanup();
  sedesState.data = [];
  sedesState.loading = false;
  sedesState.errorMessage = null;
  canMutate.mockReset();
  useSedesMock.mockReset();
  useSedesMock.mockImplementation(defaultSedesHook);
});

describe("SedesListView", () => {
  it("anuncia la carga de sedes", () => {
    sedesState.loading = true;

    render(<SedesListView />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando sedes...");
  });

  it("presenta el estado vacío dentro de un listado nombrado", () => {
    render(<SedesListView />);

    const listado = screen.getByRole("region", { name: "Listado de sedes" });
    expect(listado).toHaveTextContent("No hay sedes");
    expect(listado).toHaveTextContent("Crea la primera sede para empezar.");
  });

  it("ofrece acciones nombradas y conserva sus flujos para quien puede modificar", () => {
    sedesState.data = [sedeCentral];
    canMutate.mockReturnValue(true);

    render(<SedesListView />);

    fireEvent.click(screen.getByRole("button", { name: "Nueva sede" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Nueva sede");

    fireEvent.click(screen.getByRole("button", { name: "Editar sede Central" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Editar sede");

    fireEvent.click(screen.getByRole("button", { name: "Eliminar sede Central" }));
    expect(screen.getByText("Eliminar sede")).toBeInTheDocument();
  });

  it("no expone acciones de modificación sin permiso", () => {
    sedesState.data = [sedeCentral];
    canMutate.mockReturnValue(false);

    render(<SedesListView />);

    expect(screen.queryByRole("button", { name: "Nueva sede" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar sede Central" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar sede Central" })).not.toBeInTheDocument();
  });

  it("mantiene el alta simple y envía el payload de clonación confirmado a la mutación", async () => {
    const createOne = vi.fn().mockResolvedValue({ id: "sede-simple" });
    const cloneOne = vi.fn().mockResolvedValue({
      sede: { id: "sede-clonada" },
      mappings: { equipos: {}, sesiones: {} },
      resumen: { equipos: 1, entrenadores: 0, jugadores: 0, sesiones: 0, parametros: 0, documentos: 0, ejercicios: 0 },
    });
    useSedesMock.mockReturnValue({
      ...sedesState,
      createOne,
      cloneOne,
      updateOne: vi.fn(),
      deleteOne: vi.fn(),
      createLoading: false,
      updateLoading: false,
      cloneLoading: false,
      createErrorMessage: null,
      updateErrorMessage: null,
      cloneErrorMessage: null,
      refetch: vi.fn(),
    });
    canMutate.mockReturnValue(true);

    render(<SedesListView />);
    fireEvent.click(screen.getByRole("button", { name: "Nueva sede" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear sede simple" }));
    await Promise.resolve();
    expect(createOne).toHaveBeenCalledWith({ nombre: "Sede simple", direccion: "Calle simple", workspaceId: "workspace-1" });

    fireEvent.click(screen.getByRole("button", { name: "Nueva sede" }));
    fireEvent.click(screen.getByRole("button", { name: "Activar clonación" }));
    fireEvent.click(screen.getByRole("button", { name: "Elegir origen" }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar contenido" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar clonación" }));
    await Promise.resolve();

    expect(cloneOne).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      sourceSedeId: "sede-origen",
      nombre: "Sede clonada",
      direccion: "Calle clonada",
      seleccion: { equipos: [], entrenadores: [], jugadores: ["jugador-confirmado"], sesiones: [], parametros: [], documentos: [] },
    });
  });
});
