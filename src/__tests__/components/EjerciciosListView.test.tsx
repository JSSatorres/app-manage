import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EjerciciosListView } from "@/components/ejercicios/EjerciciosListView";

const mocks = vi.hoisted(() => ({
  createOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
  documentosErrorMessage: null as string | null,
  formProps: null as {
    open: boolean;
    title: string;
    errorMessage?: string | null;
    onSubmit: (value: {
      titulo: string;
      objetivoPrincipal: null;
      numeroJugadoresMin: null;
      esGlobal: boolean;
      sedePropietariaId: null;
      documentoIds: string[];
    }) => Promise<void>;
  } | null,
}));

vi.mock("@/hooks/useEjercicios", () => ({
  useEjercicios: () => ({
    data: [{
      id: "ejercicio-1",
      titulo: "Rondo",
      objetivoPrincipal: null,
      esGlobal: false,
    }],
    loading: false,
    errorMessage: null,
    createOne: mocks.createOne,
    updateOne: mocks.updateOne,
    deleteOne: mocks.deleteOne,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    createErrorMessage: "PostgREST 42501: permiso denegado",
    updateErrorMessage: "PostgREST 42501: permiso denegado",
    deleteErrorMessage: null,
    documentosErrorMessage: mocks.documentosErrorMessage,
  }),
}));

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({
    activeSede: { id: "sede-1" },
    activeWorkspaceId: "workspace-1",
    rol: "AdminSede",
  }),
}));

vi.mock("@/lib/permisos", () => ({ can: () => true }));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ComponentProps<"button">) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock("@/components/shared/PageHeader", () => ({
  PageHeader: ({ action }: { action?: React.ReactNode }) => <div>{action}</div>,
}));

vi.mock("@/components/shared/DataTable", () => ({
  DataTable: ({ data, onRowClick }: {
    data: Array<{ id: string }>;
    onRowClick?: (row: { id: string }) => void;
  }) => (
    <button type="button" onClick={() => onRowClick?.(data[0])}>Editar fila</button>
  ),
}));

vi.mock("@/components/shared/ConfirmDialog", () => ({ ConfirmDialog: () => null }));
vi.mock("@/components/shared/MobileCardRow", () => ({ MobileCardRow: () => null }));
vi.mock("@/components/ui/badge", () => ({ Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));

vi.mock("@/components/ejercicios/EjercicioForm", () => ({
  EjercicioForm: (props: NonNullable<typeof mocks.formProps>) => {
    mocks.formProps = props;
    if (!props.open) return null;
    return (
      <section aria-label={props.title}>
        <p>{props.errorMessage}</p>
        <button
          type="button"
          onClick={() => props.onSubmit({
            titulo: "Rondo",
            objetivoPrincipal: null,
            numeroJugadoresMin: null,
            esGlobal: false,
            sedePropietariaId: null,
            documentoIds: [],
          })}
        >
          Guardar ejercicio
        </button>
      </section>
    );
  },
}));

describe("EjerciciosListView", () => {
  beforeEach(() => {
    mocks.createOne.mockReset().mockResolvedValue(null);
    mocks.updateOne.mockReset().mockResolvedValue(null);
    mocks.deleteOne.mockReset();
    mocks.documentosErrorMessage = null;
    mocks.formProps = null;
  });

  it("conserva abierto el alta y muestra el rechazo cuando createOne no persiste una fila", async () => {
    render(<EjerciciosListView />);

    fireEvent.click(screen.getByRole("button", { name: /nuevo/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar ejercicio/i }));

    await waitFor(() => expect(mocks.createOne).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("region", { name: "Nuevo ejercicio" })).toBeInTheDocument();
    expect(
      screen.getByText(/no se pudo guardar el ejercicio: postgrest 42501: permiso denegado/i),
    ).toBeInTheDocument();
  });

  it("conserva abierto el formulario de edición cuando updateOne no persiste una fila", async () => {
    render(<EjerciciosListView />);

    fireEvent.click(screen.getByRole("button", { name: /editar fila/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar ejercicio/i }));

    await waitFor(() => expect(mocks.updateOne).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("region", { name: "Editar ejercicio" })).toBeInTheDocument();
    expect(
      screen.getByText(/no se pudo guardar el ejercicio: postgrest 42501: permiso denegado/i),
    ).toBeInTheDocument();
  });

  it("muestra el feedback parcial de asociaciones sin reabrir el formulario", () => {
    mocks.documentosErrorMessage =
      "El ejercicio se guardó, pero no se pudieron asociar sus documentos. Edita el ejercicio para volver a intentarlo.";

    render(<EjerciciosListView />);

    expect(screen.getByText(/el ejercicio se guardó, pero no se pudieron asociar sus documentos/i)).toBeInTheDocument();
  });
});
