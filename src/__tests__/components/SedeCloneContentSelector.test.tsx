import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SedeCloneContentSelector } from "@/components/sedes/SedeCloneContentSelector";
import type { CloneSedeSelection, CloneableSedeContent, Sede } from "@/types/sedes";

const workspaceId = "workspace-1";

const sedes: Sede[] = [
  {
    id: "sede-origen",
    nombre: "Sede Norte",
    direccion: null,
    configuracionVisual: {},
    responsableId: null,
    workspaceId,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  },
  {
    id: "sede-ajena",
    nombre: "Sede ajena",
    direccion: null,
    configuracionVisual: {},
    responsableId: null,
    workspaceId: "workspace-2",
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
  },
];

const emptySelection: CloneSedeSelection = {
  equipos: [],
  entrenadores: [],
  jugadores: [],
  sesiones: [],
  parametros: [],
  documentos: [],
};

const content: CloneableSedeContent = {
  equipos: [
    { id: "equipo-juvenil", label: "Juvenil A", categoria: "Juvenil" },
    { id: "equipo-cadete", label: "Cadete B", categoria: "Cadete" },
  ],
  entrenadores: [{ id: "entrenador-ana", label: "Ana Pérez" }],
  jugadores: [{ id: "jugador-leo", label: "Leo Ruiz" }],
  sesiones: [
    {
      id: "sesion-juvenil",
      label: "12/08/2026",
      equipoId: "equipo-juvenil",
      trainerIds: ["entrenador-ana"],
    },
  ],
  parametros: [{ id: "parametro-color", label: "Color principal", categoria: "visual" }],
  documentos: [{ id: "documento-plan", label: "Plan de temporada" }],
};

describe("SedeCloneContentSelector", () => {
  function ControlledSelector({ initialSelection = emptySelection }: { initialSelection?: CloneSedeSelection }) {
    const [selection, setSelection] = useState(initialSelection);

    return (
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={selection}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={setSelection}
      />
    );
  }

  it("solo permite elegir como origen una sede del mismo workspace", () => {
    const onSourceSedeIdChange = vi.fn();
    render(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId={null}
        content={content}
        selection={emptySelection}
        onSourceSedeIdChange={onSourceSedeIdChange}
        onSelectionChange={vi.fn()}
      />,
    );

    const sourceSelect = screen.getByRole("combobox", { name: "Sede de origen" });
    expect(screen.getByRole("option", { name: "Sede Norte" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Sede ajena" })).not.toBeInTheDocument();

    fireEvent.change(sourceSelect, { target: { value: "sede-origen" } });

    expect(onSourceSedeIdChange).toHaveBeenCalledWith("sede-origen");

    const categoryToggle = screen.getByRole("button", { name: "Ocultar equipos" });
    expect(categoryToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(categoryToggle);

    expect(screen.getByRole("button", { name: "Mostrar equipos" })).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("sede-clone-equipos")).not.toBeInTheDocument();
  });

  it("eleva la selección individual y por categoría con estados triestado", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={emptySelection}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Juvenil A" }));

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      ...emptySelection,
      equipos: ["equipo-juvenil"],
    });

    rerender(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={{ ...emptySelection, equipos: ["equipo-juvenil"] }}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Seleccionar equipos" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar equipos" }));

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      ...emptySelection,
      equipos: ["equipo-juvenil", "equipo-cadete"],
    });
  });

  it("mantiene el selector global desmarcado cuando solo están seleccionados todos los equipos", () => {
    render(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={{ ...emptySelection, equipos: ["equipo-juvenil", "equipo-cadete"] }}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Seleccionar todo" })).toHaveAttribute("aria-checked", "false");
  });

  it("marca el selector global cuando todo el contenido está seleccionado", () => {
    render(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={{
          equipos: ["equipo-juvenil", "equipo-cadete"],
          entrenadores: ["entrenador-ana"],
          jugadores: ["jugador-leo"],
          sesiones: ["sesion-juvenil"],
          parametros: ["parametro-color"],
          documentos: ["documento-plan"],
        }}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Seleccionar todo" })).toHaveAttribute("aria-checked", "true");
  });

  it("permite conservar una sesión seleccionada al desmarcar su equipo", () => {
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={{ ...emptySelection, equipos: ["equipo-juvenil"], sesiones: ["sesion-juvenil"] }}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todo" }));

    expect(onSelectionChange).toHaveBeenLastCalledWith({
      equipos: ["equipo-juvenil", "equipo-cadete"],
      entrenadores: ["entrenador-ana"],
      jugadores: ["jugador-leo"],
      sesiones: ["sesion-juvenil"],
      parametros: ["parametro-color"],
      documentos: ["documento-plan"],
    });

    rerender(
      <SedeCloneContentSelector
        workspaceId={workspaceId}
        sedes={sedes}
        sourceSedeId="sede-origen"
        content={content}
        selection={emptySelection}
        onSourceSedeIdChange={vi.fn()}
        onSelectionChange={onSelectionChange}
      />,
    );

  });

  it("incluye y bloquea las dependencias de una sesión, y libera solo las automáticas", () => {
    render(<ControlledSelector />);

    const trainer = screen.getByRole("checkbox", { name: "Ana Pérez" });
    fireEvent.click(trainer);

    const session = screen.getByRole("checkbox", { name: "12/08/2026" });
    session.focus();
    expect(session).toHaveFocus();
    fireEvent.click(session);

    const team = screen.getByRole("checkbox", { name: "Juvenil A" });
    expect(session).toBeChecked();
    expect(team).toBeChecked();
    expect(trainer).toBeChecked();
    expect(team).toHaveAttribute("aria-checked", "true");
    expect(team).toHaveAttribute("aria-disabled", "true");
    expect(trainer).toHaveAttribute("aria-disabled", "true");
    expect(team).toHaveAccessibleDescription(
      "Este elemento está incluido porque es necesario para una sesión seleccionada.",
    );
    expect(session).toHaveAccessibleDescription(
      "Al seleccionar una sesión se incluyen automáticamente su equipo y sus entrenadores.",
    );

    fireEvent.keyDown(session, { key: " ", code: "Space" });
    fireEvent.click(session);

    expect(session).not.toBeChecked();
    expect(team).not.toBeChecked();
    expect(trainer).toBeChecked();
    expect(team).not.toHaveAttribute("aria-disabled", "true");
    expect(trainer).not.toHaveAttribute("aria-disabled", "true");
  });

  it("expone un locator estable para cada sesión sin alterar su nombre accesible", () => {
    render(<ControlledSelector />);

    expect(screen.getByTestId("clone-session-sesion-juvenil")).toHaveAccessibleName("12/08/2026");
  });
  it("anuncia la carga, el vacío y el error en regiones accesibles", () => {
    const props = {
      workspaceId,
      sedes,
      sourceSedeId: "sede-origen",
      selection: emptySelection,
      onSourceSedeIdChange: vi.fn(),
      onSelectionChange: vi.fn(),
    };
    const { rerender } = render(
      <SedeCloneContentSelector {...props} content={null} loading />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cargando el contenido de la sede de origen");

    rerender(
      <SedeCloneContentSelector {...props} content={{ ...content, equipos: [], entrenadores: [], jugadores: [], sesiones: [], parametros: [], documentos: [] }} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("no tiene contenido disponible para clonar");

    rerender(<SedeCloneContentSelector {...props} content={null} errorMessage="No se ha podido cargar." />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido cargar.");
  });
});
