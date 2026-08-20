import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";
import type { Documento } from "@/types/documentos";

/**
 * Migración RHF + Zod (Task 3.1, Lote C). El resolver alterna entre las tres
 * variantes de `src/schemas/documento.schema.ts` (Task 2.2) según el modo
 * (archivo/enlace) y si se está editando: ver
 * docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

vi.mock("@/hooks/useSedesLookup", () => ({
  useSedesLookup: () => ({
    data: [
      { id: "11111111-1111-4111-8111-111111111111", nombre: "Sede Central" },
      { id: "22222222-2222-4222-8222-222222222222", nombre: "Sede Norte" },
    ],
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

const { entrenadoresLookupCalls } = vi.hoisted(() => ({
  entrenadoresLookupCalls: [] as string[][],
}));

vi.mock("@/hooks/useEntrenadoresLookupBySedes", () => ({
  useEntrenadoresLookupBySedes: (sedeIds: string[]) => {
    entrenadoresLookupCalls.push(sedeIds);
    return { data: [], loading: false, errorMessage: null, refetch: vi.fn() };
  },
}));

function getField(baseElement: HTMLElement, name: string) {
  const el = baseElement.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el campo "${name}"`);
  return el as HTMLInputElement;
}

const globalDocumento: Documento = {
  id: "documento-global",
  contentAssetId: "asset-global",
  titulo: "Documento global",
  categoriaDoc: null,
  driveFileId: null,
  storagePath: "workspace/documento-global.pdf",
  fileName: "documento-global.pdf",
  mimeType: "application/pdf",
  sizeBytes: 128,
  extension: "pdf",
  sourceType: "file",
  externalUrl: null,
  sedeId: null,
  sedeIds: [],
  equipoIds: [],
  workspaceId: "workspace-1",
  visibleEntrenadores: false,
  entrenadorIds: [],
  createdAt: "2026-08-16T10:00:00.000Z",
  updatedAt: "2026-08-16T10:00:00.000Z",
};

const managedYouTubeDocumento: Documento = {
  ...globalDocumento,
  id: "documento-youtube",
  contentAssetId: "asset-youtube",
  titulo: "Análisis de partido",
  storagePath: null,
  fileName: null,
  mimeType: null,
  sizeBytes: null,
  extension: "youtube",
  sourceType: "link",
  externalUrl: "https://www.youtube.com/watch?v=persistido",
};

describe("DocumentoForm", () => {
  it("preselecciona la sede activa al crear un documento", async () => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Nuevo documento"
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("button", { name: /Sede Central/i }),
    ).toBeInTheDocument();
  });

  it("mantiene un documento global sin sede al editar aunque haya una sede activa", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Editar documento"
        initialValue={globalDocumento}
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() =>
      expect(getField(baseElement, "titulo")).toHaveValue("Documento global"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sedeIds: [] }),
    );
  });

  it("muestra la URL gestionada como identidad de solo lectura al editar", async () => {
    const { baseElement } = render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Editar documento"
        initialValue={managedYouTubeDocumento}
        sourceProvider="youtube"
        onSubmit={vi.fn()}
      />,
    );

    const urlInput = baseElement.querySelector('input[type="url"]');
    if (!(urlInput instanceof HTMLInputElement)) {
      throw new Error("No se encontró el campo URL");
    }
    await waitFor(() =>
      expect(urlInput).toHaveValue(managedYouTubeDocumento.externalUrl),
    );
    expect(urlInput).toBeDisabled();
    expect(
      screen.getByText(/identifica el recurso gestionado y no se puede cambiar/i),
    ).toBeInTheDocument();
  });

  it("conserva la URL persistida si el formulario gestionado fuera manipulado", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Editar documento"
        initialValue={managedYouTubeDocumento}
        sourceProvider="youtube"
        onSubmit={onSubmit}
      />,
    );

    const urlInput = baseElement.querySelector('input[type="url"]');
    if (!(urlInput instanceof HTMLInputElement)) {
      throw new Error("No se encontró el campo URL");
    }
    await waitFor(() =>
      expect(getField(baseElement, "titulo")).toHaveValue(
        managedYouTubeDocumento.titulo,
      ),
    );
    fireEvent.change(urlInput, {
      target: { value: "https://www.youtube.com/watch?v=manipulado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        externalUrl: managedYouTubeDocumento.externalUrl,
      }),
    );
  });

  it("restaura la sede activa al cerrar y reabrir un alta", async () => {
    const defaultSedeIds = ["11111111-1111-4111-8111-111111111111"];
    const props = {
      onOpenChange: vi.fn(),
      title: "Nuevo documento",
      defaultSedeIds,
      onSubmit: vi.fn(),
    };
    const { rerender } = render(<DocumentoForm open {...props} />);

    expect(
      await screen.findByRole("button", { name: /Sede Central/i }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar selección" }));
    expect(
      screen.getByRole("button", { name: /Sin sede \(global\)/i }),
    ).toBeInTheDocument();

    rerender(<DocumentoForm open={false} {...props} />);
    rerender(<DocumentoForm open {...props} />);

    expect(
      await screen.findByRole("button", { name: /Sede Central/i }),
    ).toBeInTheDocument();
  });

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

  it.each([
    ["YouTube", "youtube", "https://www.youtube.com/watch?v=abc123"],
    ["Google Drive", "google_drive", "https://drive.google.com/file/d/abc/view"],
  ] as const)("permite localizar y usar el enlace de %s mediante su etiqueta", async (_, sourceProvider, url) => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Añadir documento"
        sourceProvider={sourceProvider}
        onSubmit={vi.fn()}
      />,
    );

    const externalUrl = await screen.findByLabelText(/Enlace \(URL\)/);
    fireEvent.change(externalUrl, { target: { value: url } });

    expect(externalUrl).toHaveValue(url);
  });

  it("llama a onSubmit con el payload correcto al guardar un enlace válido", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm open onOpenChange={vi.fn()} title="Nuevo documento" onSubmit={onSubmit} />,
    );

    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: /enlace/i }));

    expect(
      baseElement.querySelector('input[type="url"]'),
    ).toBeEnabled();
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

  it("limita la subida privada para que el cuerpo del diálogo sea desplazable", () => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Subir archivo"
        sourceProvider="supabase_storage"
        onSubmit={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Subir archivo" });
    const form = dialog.querySelector("form");
    const body = dialog.querySelector('[data-slot="dialog-body"]');

    expect(form).toHaveClass("flex", "flex-1", "min-h-0", "flex-col");
    expect(body).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
    expect(body).not.toContain(
      screen.getByRole("button", { name: "Subir documento" }),
    );
  });

  it("al activar Global oculta el selector de sedes y envía sedeIds vacío", async () => {
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Nuevo documento"
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={onSubmit}
      />,
    );

    expect(await screen.findByRole("button", { name: /Sede Central/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /global/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Sede Central/i })).not.toBeInTheDocument(),
    );

    fireEvent.change(getField(baseElement, "titulo"), { target: { value: "Documento Test" } });
    const file = new File(["contenido"], "documento.pdf", { type: "application/pdf" });
    fireEvent.change(baseElement.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: /subir documento/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ sedeIds: [], equipoIds: [] });
  });

  it("marca Global al editar un documento sin sedes aunque haya sede activa", async () => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Editar documento"
        initialValue={globalDocumento}
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /global/i })).toBeChecked(),
    );
    expect(screen.queryByRole("button", { name: /Sede Central/i })).not.toBeInTheDocument();
  });

  it("no marca Global al editar un documento con sede asignada", async () => {
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Editar documento"
        initialValue={{
          ...globalDocumento,
          sedeId: "11111111-1111-4111-8111-111111111111",
          sedeIds: ["11111111-1111-4111-8111-111111111111"],
        }}
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /global/i })).not.toBeChecked(),
    );
    expect(await screen.findByRole("button", { name: /Sede Central/i })).toBeInTheDocument();
  });

  it("con Global consulta los entrenadores de todas las sedes y oculta los equipos", async () => {
    entrenadoresLookupCalls.length = 0;
    render(
      <DocumentoForm
        open
        onOpenChange={vi.fn()}
        title="Nuevo documento"
        defaultSedeIds={["11111111-1111-4111-8111-111111111111"]}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("switch", { name: /global/i }));

    await waitFor(() =>
      expect(entrenadoresLookupCalls.at(-1)).toEqual([
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ]),
    );
    expect(screen.queryByText(/^Equipos$/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/todos los entrenadores del club podrán ver este documento/i),
    ).toBeInTheDocument();
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
