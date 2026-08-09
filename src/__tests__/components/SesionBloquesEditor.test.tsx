import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SesionBloquesEditor } from "@/components/sesiones/SesionBloquesEditor";
import type { Documento } from "@/types/documentos";
import type { Ejercicio } from "@/types/ejercicios";
import type { SesionBloqueDraft } from "@/types/sesion-bloques";

const EJERCICIO_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENTO_ID = "22222222-2222-4222-8222-222222222222";

const ejercicios: Ejercicio[] = [
  {
    id: EJERCICIO_ID,
    titulo: "Rondo",
    objetivoPrincipal: "Posesión",
    numeroJugadoresMin: null,
    sedePropietariaId: null,
    esGlobal: false,
    documentoIds: [],
    createdAt: "",
    updatedAt: "",
  },
];

const documentos: Documento[] = [
  {
    id: DOCUMENTO_ID,
    titulo: "Guía del rondo",
    categoriaDoc: null,
    driveFileId: null,
    storagePath: null,
    fileName: null,
    mimeType: null,
    sizeBytes: null,
    extension: null,
    sourceType: "link",
    externalUrl: "https://example.test/rondo",
    sedeId: null,
    sedeIds: [],
    equipoIds: [],
    workspaceId: null,
    visibleEntrenadores: false,
    entrenadorIds: [],
    createdAt: "",
    updatedAt: "",
  },
];

function renderEditor(initialBloques: SesionBloqueDraft[] = []) {
  function ControlledEditor() {
    const [bloques, setBloques] = useState(initialBloques);
    return (
      <SesionBloquesEditor
        bloques={bloques}
        ejercicios={ejercicios}
        documentos={documentos}
        onChange={setBloques}
        showErrors
      />
    );
  }

  return render(<ControlledEditor />);
}

describe("SesionBloquesEditor", () => {
  it("añade un bloque y muestra mensajes semánticos para sus campos obligatorios", () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /añadir bloque/i }));

    expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toBeInTheDocument();
    expect(screen.getByText("El título es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("La duración debe ser positiva.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona un ejercicio.")).toBeInTheDocument();
  });

  it("permite repetir ejercicio, editar, borrar y renumerar bloques", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 1 },
      { id: "dos", titulo: "Parte principal", duracionMinutos: 20, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 2 },
    ]);

    fireEvent.change(screen.getByRole("textbox", { name: /título del bloque 2/i }), {
      target: { value: "Rondo final" },
    });
    fireEvent.click(screen.getByRole("button", { name: /eliminar bloque 1/i }));

    expect(screen.getByText("Bloque 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rondo final")).toBeInTheDocument();
  });

  it("bloquea eliminar el último bloque y conserva identidad y contenido al reordenar", () => {
    const firstEditor = renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 1 },
      { id: "dos", titulo: "Parte principal", duracionMinutos: 20, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 2 },
    ]);

    expect(screen.getByRole("button", { name: /subir bloque 1/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /bajar bloque 2/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /bajar bloque 1/i }));

    expect(screen.getAllByText(/Bloque [12]/)[0]).toHaveTextContent("Bloque 1");
    expect(screen.getAllByRole("textbox", { name: /título del bloque/i })[0]).toHaveValue("Parte principal");

    firstEditor.unmount();
    renderEditor([
      { id: "solo", titulo: "Único", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 1 },
    ]);
    expect(screen.getByRole("button", { name: /eliminar bloque 1/i })).toBeDisabled();
  });

  it("muestra la selección de un recurso, permite quitarlo y abrirlo de forma segura", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const unselectedEditor = renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, orden: 1 },
    ]);

    fireEvent.click(screen.getByRole("combobox", { name: /seleccionar recurso del bloque 1/i }));
    expect(screen.getByRole("option", { name: "Guía del rondo" })).toBeInTheDocument();
    unselectedEditor.unmount();
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: DOCUMENTO_ID, orden: 1 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /abrir recurso del bloque 1/i }));

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("https://example.test/rondo", "_blank", "noopener,noreferrer"),
    );
    fireEvent.click(screen.getByRole("button", { name: /quitar recurso del bloque 1/i }));
    expect(screen.getAllByText(/sin recurso asociado/i).length).toBeGreaterThan(0);
    open.mockRestore();
  });
});
