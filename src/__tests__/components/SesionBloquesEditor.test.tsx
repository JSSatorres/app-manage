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
    contentAssetId: null,
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
    expect(screen.queryByText("Selecciona un ejercicio.")).not.toBeInTheDocument();
  });

  it("abre el selector de ejercicio y comunica la opción elegida", async () => {
    const onChange = vi.fn();
    const bloques: SesionBloqueDraft[] = [
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ];
    render(
      <SesionBloquesEditor
        bloques={bloques}
        ejercicios={ejercicios}
        documentos={documentos}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    fireEvent.click(screen.getByRole("combobox", { name: /ejercicio del bloque 1/i }));
    const option = await screen.findByRole("option", { name: "Rondo" });
    fireEvent.mouseMove(option);
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith([
      { ...bloques[0], ejercicioId: EJERCICIO_ID },
    ]);
  });

  it("permite repetir ejercicio, editar, borrar y renumerar bloques", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
      { id: "dos", titulo: "Parte principal", duracionMinutos: 20, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 2/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /título del bloque 2/i }), {
      target: { value: "Rondo final" },
    });
    fireEvent.click(screen.getByRole("button", { name: /eliminar bloque 1/i }));

    expect(screen.getByText("Bloque 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rondo final")).toBeInTheDocument();
  });

  it("bloquea eliminar el último bloque y conserva identidad y contenido al reordenar", () => {
    const firstEditor = renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
      { id: "dos", titulo: "Parte principal", duracionMinutos: 20, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 2 },
    ]);

    expect(screen.getByRole("button", { name: /subir bloque 1/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /bajar bloque 2/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /bajar bloque 1/i }));

    expect(screen.getAllByText(/Bloque [12]/)[0]).toHaveTextContent("Bloque 1");
    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.getAllByRole("textbox", { name: /título del bloque/i })[0]).toHaveValue("Parte principal");

    firstEditor.unmount();
    renderEditor([
      { id: "solo", titulo: "Único", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
    ]);
    expect(screen.getByRole("button", { name: /eliminar bloque 1/i })).toBeDisabled();
  });

  it("muestra la selección de un documento, permite quitarlo y abrirlo de forma segura", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const unselectedEditor = renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.getByText("Documento (opcional)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: /seleccionar documento del bloque 1/i }));
    expect(screen.getByRole("option", { name: /Guía del rondo/ })).toBeInTheDocument();
    unselectedEditor.unmount();
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: DOCUMENTO_ID, notas: null, orden: 1 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /abrir documento del bloque 1/i }));

    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("https://example.test/rondo", "_blank", "noopener,noreferrer"),
    );
    fireEvent.click(screen.getByRole("button", { name: /quitar documento del bloque 1/i }));
    expect(screen.getAllByText(/sin documento asociado/i).length).toBeGreaterThan(0);
    open.mockRestore();
  });

  it("indica el origen de cada documento en el selector", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: EJERCICIO_ID, documentoId: null, notas: null, orden: 1 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    fireEvent.click(screen.getByRole("combobox", { name: /seleccionar documento del bloque 1/i }));
    const option = screen.getByRole("option", { name: /Guía del rondo/ });
    expect(option).toHaveTextContent("Enlace");
  });

  it("explica dónde crear documentos cuando no hay ninguno disponible", () => {
    render(
      <SesionBloquesEditor
        bloques={[{ id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 }]}
        ejercicios={ejercicios}
        documentos={[]}
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.getByText(/no hay documentos disponibles/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /documentos/i })).toHaveAttribute("href", "/documentos");
  });

  it("permite escribir notas libres sin exigir ejercicio ni documento", () => {
    const onChange = vi.fn();
    const bloques: SesionBloqueDraft[] = [
      { id: "uno", titulo: "Charla", duracionMinutos: 5, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ];
    render(
      <SesionBloquesEditor
        bloques={bloques}
        ejercicios={ejercicios}
        documentos={documentos}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /notas del bloque 1/i }), {
      target: { value: "Repaso táctico" },
    });

    expect(onChange).toHaveBeenCalledWith([{ ...bloques[0], notas: "Repaso táctico" }]);
  });

  it("muestra los bloques recibidos contraídos con su título y duración", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ]);

    expect(screen.getByText("Activación")).toBeInTheDocument();
    expect(screen.getByText("10 min")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expandir bloque 1/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("permite expandir y contraer un bloque libremente", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toHaveValue("Activación");

    fireEvent.click(screen.getByRole("button", { name: /contraer bloque 1/i }));
    expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
  });

  it("al añadir un bloque contrae los anteriores y deja expandido solo el nuevo", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /añadir bloque/i }));

    expect(screen.queryByRole("textbox", { name: /título del bloque 1/i })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /título del bloque 2/i })).toBeInTheDocument();
  });

  it("permite tener varios bloques expandidos a la vez", () => {
    renderEditor([
      { id: "uno", titulo: "Activación", duracionMinutos: 10, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
      { id: "dos", titulo: "Principal", duracionMinutos: 20, ejercicioId: null, documentoId: null, notas: null, orden: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 2/i }));

    expect(screen.getByRole("textbox", { name: /título del bloque 1/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /título del bloque 2/i })).toBeInTheDocument();
  });

  it("avisa en la cabecera cuando un bloque contraído tiene errores", () => {
    renderEditor([
      { id: "uno", titulo: "", duracionMinutos: null, ejercicioId: null, documentoId: null, notas: null, orden: 1 },
    ]);

    expect(screen.getByText(/revisa este bloque/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /expandir bloque 1/i }));
    expect(screen.queryByText(/revisa este bloque/i)).not.toBeInTheDocument();
    expect(screen.getByText("El título es obligatorio.")).toBeInTheDocument();
  });
});
