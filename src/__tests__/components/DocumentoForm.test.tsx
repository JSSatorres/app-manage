import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";

/**
 * Migración RHF + Zod (Task 3.1, Lote C). El resolver alterna entre las tres
 * variantes de `src/schemas/documento.schema.ts` (Task 2.2) según el modo
 * (archivo/enlace) y si se está editando: ver
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

vi.mock("@/hooks/useEquiposLookup", () => ({
  useEquiposLookup: () => ({
    data: [],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useEntrenadoresLookupBySedes", () => ({
  useEntrenadoresLookupBySedes: () => ({
    data: [],
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

describe("DocumentoForm", () => {
  it("no llama a onSubmit y muestra errores cuando falta el título y el archivo (modo archivo)", async () => {
    const onSubmit = vi.fn();
    render(
      <DocumentoForm open onOpenChange={vi.fn()} title="Nuevo documento" onSubmit={onSubmit} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /subir documento/i }));

    expect(await screen.findByText(/título requerido/i)).toBeInTheDocument();
    expect(await screen.findByText(/selecciona un archivo/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto al subir un archivo válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm open onOpenChange={vi.fn()} title="Nuevo documento" onSubmit={onSubmit} />,
    );

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Documento Test" } });

    const file = new File(["contenido"], "documento.pdf", { type: "application/pdf" });
    const fileInput = baseElement.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: /subir documento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "file",
      titulo: "Documento Test",
      categoriaDoc: "",
      sedeIds: [],
      equipoIds: [],
      file,
      externalUrl: "",
      visibleEntrenadores: false,
      entrenadorIds: [],
    });
  });

  it("no llama a onSubmit y muestra un error cuando la URL es inválida (modo enlace)", async () => {
    const onSubmit = vi.fn();
    render(
      <DocumentoForm open onOpenChange={vi.fn()} title="Nuevo documento" onSubmit={onSubmit} />,
    );

    // El montaje inicial agenda un `reset()` a los valores por defecto (modo
    // "archivo") vía `queueMicrotask` (mismo patrón que EquipoForm/JugadorForm).
    // Se espera a que se resuelva antes de cambiar de modo, para que no
    // sobrescriba la selección de "Enlace" hecha a continuación.
    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: /enlace/i }));
    fireEvent.click(screen.getByRole("button", { name: /guardar enlace/i }));

    expect(await screen.findByText(/url inválida/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("llama a onSubmit con el payload correcto al guardar un enlace válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm open onOpenChange={vi.fn()} title="Nuevo documento" onSubmit={onSubmit} />,
    );

    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: /enlace/i }));

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Vídeo táctico" } });
    fireEvent.change(baseElement.querySelector('input[type="url"]') as HTMLInputElement, {
      target: { value: "https://www.youtube.com/watch?v=abc123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /guardar enlace/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      mode: "link",
      titulo: "Vídeo táctico",
      categoriaDoc: "",
      sedeIds: [],
      equipoIds: [],
      file: null,
      externalUrl: "https://www.youtube.com/watch?v=abc123",
      visibleEntrenadores: false,
      entrenadorIds: [],
    });
  });

  it("bloquea un enlace de Drive cuando el alta se inició desde YouTube", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Añadir vídeo"
        sourceProvider="youtube"
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Táctica" } });
    fireEvent.change(baseElement.querySelector('input[type="url"]') as HTMLInputElement, {
      target: { value: "https://drive.google.com/file/d/abc/view" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar enlace/i }));

    expect(await screen.findByText("Introduce un enlace HTTPS de YouTube.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("muestra el progreso y permite solicitar la cancelación de una subida", () => {
    const onCancelUpload = vi.fn();
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Subir archivo"
        sourceProvider="supabase_storage"
        loading
        onCancelUpload={onCancelUpload}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Progreso de subida" })).toHaveAttribute(
      "aria-valuetext",
      "Subiendo el archivo",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancelar subida" }));
    expect(onCancelUpload).toHaveBeenCalledOnce();
  });

  it("anuncia en español los errores de cuota o del proveedor", () => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Subir archivo"
        sourceProvider="supabase_storage"
        errorMessage="No hay espacio disponible para subir este documento."
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No hay espacio disponible para subir este documento.",
    );
  });
});
