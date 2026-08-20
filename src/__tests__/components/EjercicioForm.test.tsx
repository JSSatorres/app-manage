import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EjercicioForm } from "@/components/ejercicios/EjercicioForm";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchDocumentosDisponibles } from "@/services/documentos.service";

const formMocks = vi.hoisted(() => ({
  docsQuery: {
    data: null as unknown,
    count: null,
    loading: false,
    errorMessage: null as string | null,
    refetch: vi.fn(),
  },
  workspace: {
    activeSede: { id: "sede-active", nombre: "Sede Central" },
    activeWorkspaceId: "workspace-active",
  },
  useQuery: vi.fn(),
}));

/**
 * Migración RHF + Zod (Task 3.1, Lote C). El schema (`createEjercicioSchema`)
 * es la fuente de verdad de la validación: ver
 * docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

vi.mock("@/hooks/useSedesLookup", () => ({
  useSedesLookup: () => ({
    data: [{ id: "11111111-1111-4111-8111-111111111111", nombre: "Sede Central" }],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: formMocks.useQuery,
}));

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => formMocks.workspace,
}));

vi.mock("@/services/documentos.service", () => ({
  fetchDocumentosDisponibles: vi.fn(),
}));

beforeEach(() => {
  formMocks.docsQuery.data = null;
  formMocks.docsQuery.loading = false;
  formMocks.docsQuery.errorMessage = null;
  formMocks.workspace.activeSede = { id: "sede-active", nombre: "Sede Central" };
  formMocks.workspace.activeWorkspaceId = "workspace-active";
  formMocks.useQuery.mockClear();
  formMocks.useQuery.mockImplementation(() => formMocks.docsQuery);
  vi.mocked(fetchDocumentosDisponibles).mockReset();
});

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("EjercicioForm", () => {
  it("no llama a onSubmit y muestra un error cuando el título es inválido", async () => {
    const onSubmit = vi.fn();
    render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByText(/título requerido/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto cuando el formulario es válido", async () => {
    const onSubmit = vi.fn();
    formMocks.workspace.activeSede = null as never;
    const { baseElement } = render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Ejercicio Test" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      titulo: "Ejercicio Test",
      objetivoPrincipal: null,
      numeroJugadoresMin: null,
      esGlobal: false,
      sedePropietariaId: null,
      documentoIds: [],
    });
  });

  it("consulta el catálogo con sede, workspace y una clave aislada por tenant", async () => {
    render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={vi.fn()} />,
    );

    const [queryFn, queryKey] = formMocks.useQuery.mock.calls[0] as [() => Promise<unknown>, unknown];
    await queryFn();

    expect(fetchDocumentosDisponibles).toHaveBeenCalledWith(["sede-active"], "workspace-active");
    expect(queryKey).toEqual(
      queryKeys.documentos.available("workspace-active", ["sede-active"]),
    );
  });

  it("muestra documentos globales y de sede en el selector", () => {
    formMocks.docsQuery.data = [
      { id: "global", titulo: "Documento global", categoriaDoc: "General" },
      { id: "sede", titulo: "Documento de sede", categoriaDoc: "Táctica" },
    ];

    render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /todos/i }));

    expect(screen.getByText("Documento global")).toBeInTheDocument();
    expect(screen.getByText("Documento de sede")).toBeInTheDocument();
  });

  it("distingue un error de carga de una lista vacía", () => {
    formMocks.docsQuery.errorMessage = "Servicio no disponible";

    render(
      <EjercicioForm open onOpenChange={vi.fn()} title="Nuevo ejercicio" onSubmit={vi.fn()} />,
    );

    expect(
      screen.getByText("No se pudieron cargar los documentos disponibles: Servicio no disponible"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /todos/i }));
    expect(screen.queryByText("No hay documentos disponibles")).not.toBeInTheDocument();
  });
});
