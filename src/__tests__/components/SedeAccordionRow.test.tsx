import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SedeAccordionRow } from "@/components/sedes/SedeAccordionRow";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import type { Entrenador } from "@/types/entrenadores";
import type { Jugador } from "@/types/jugadores";

const queryData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("@/hooks/useQuery", () => ({
  useQuery: (_queryFn: unknown, queryKey: string[]) => ({
    data: queryData.get(queryKey.join("/")) ?? null,
    loading: false,
    errorMessage: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/sedes/SesionesEquipoList", () => ({
  SesionesEquipoList: () => <div>Contenido de sesiones</div>,
}));

const sede: Sede = {
  id: "sede-central",
  nombre: "Central",
  direccion: "Calle Mayor 1",
  configuracionVisual: {},
  responsableId: null,
  workspaceId: "workspace-1",
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const equipo: Equipo = {
  id: "equipo-juvenil-a",
  nombre: "Juvenil A",
  categoria: "Juvenil",
  sedeId: sede.id,
  workspaceId: sede.workspaceId,
  entrenadorIds: ["entrenador-ana"],
  jugadorIds: ["jugador-leo"],
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const equipos: Equipo[] = [
  equipo,
  {
    ...equipo,
    id: "equipo-cadete-b",
    nombre: "Cadete B",
    categoria: "Cadete",
  },
  {
    ...equipo,
    id: "equipo-infantil-c",
    nombre: "Infantil C",
    categoria: "Infantil",
  },
];

const entrenador: Entrenador = {
  id: "entrenador-ana",
  nombre: "Ana",
  apellidos: "Pérez",
  email: null,
  telefono: null,
  fechaNacimiento: null,
  titulacion: null,
  fotoUrl: null,
  notas: null,
  userId: null,
  workspaceId: sede.workspaceId,
  sedeIds: [sede.id],
  equipoIds: [equipo.id],
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const jugador: Jugador = {
  id: "jugador-leo",
  nombre: "Leo",
  apellidos: "Ruiz",
  email: null,
  telefono: null,
  fechaNacimiento: null,
  dorsal: 9,
  posicion: null,
  pieDominante: null,
  fotoUrl: null,
  notas: null,
  tutorNombre: null,
  tutorTelefono: null,
  userId: null,
  workspaceId: sede.workspaceId,
  sedeIds: [sede.id],
  equipoIds: [equipo.id],
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

const entrenadores = [
  entrenador,
  ...Array.from({ length: 7 }, (_, index) => ({
    ...entrenador,
    id: `entrenador-${index + 2}`,
    nombre: `Entrenador${index + 2}`,
    apellidos: "Juvenil",
  })),
];

const jugadores = [
  jugador,
  ...Array.from({ length: 11 }, (_, index) => ({
    ...jugador,
    id: `jugador-${index + 2}`,
    nombre: `Jugador${index + 2}`,
    apellidos: "Juvenil",
    dorsal: index + 10,
  })),
];

function renderSedeAccordionRow(overrides: Partial<React.ComponentProps<typeof SedeAccordionRow>> = {}) {
  const props = {
    sede,
    actions: null,
    onEditEquipo: vi.fn(),
    onEditJugador: vi.fn(),
    onEditEntrenador: vi.fn(),
    onEditSesion: vi.fn(),
    ...overrides,
  };

  return { ...render(<SedeAccordionRow {...props} />), props };
}

describe("SedeAccordionRow", () => {
  beforeEach(() => {
    queryData.clear();
    queryData.set("equipos/accordion/sede-central/true", equipos);
    queryData.set("jugadores/by-equipo/equipo-juvenil-a/true", jugadores);
    queryData.set("entrenadores/by-equipo/equipo-juvenil-a/true", entrenadores);
  });

  it("expone y conecta los niveles sede, equipo, sesiones y miembros", async () => {
    renderSedeAccordionRow();

    const sedeControl = screen.getByRole("button", { name: "Mostrar equipos de Central" });
    const sedeLandmark = screen.getByRole("region", { name: "Sede Central" });
    const sedeHeading = within(sedeLandmark).getByRole("heading", { name: "Sede Central" });
    const sedeHeader = sedeHeading.closest("header");

    expect(sedeHeader).toContainElement(sedeControl);
    expect(sedeControl).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(sedeControl);

    const equiposRegion = screen.getByRole("region", { name: "Equipos de Central" });
    expect(sedeLandmark).toContainElement(equiposRegion);
    expect(sedeControl).toHaveAttribute("aria-controls", equiposRegion.id);
    expect(equiposRegion).toHaveAttribute("aria-labelledby");

    const equipoControl = screen.getByRole("button", { name: "Mostrar contenido de Juvenil A" });
    expect(equipoControl).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(equipoControl);

    const sesionesRegion = screen.getByRole("region", { name: "Sesiones de Juvenil A" });
    const miembrosRegion = screen.getByRole("region", { name: "Miembros de Juvenil A" });
    expect(equipoControl).toHaveAttribute("aria-controls", `${sesionesRegion.id} ${miembrosRegion.id}`);
    expect(sesionesRegion).toHaveAttribute("aria-labelledby");
    expect(miembrosRegion).toHaveAttribute("aria-labelledby");
    const miembrosCollection = screen.getByRole("region", { name: "Lista de miembros de Juvenil A" });
    expect([sedeLandmark, equiposRegion, sesionesRegion, miembrosRegion, miembrosCollection]).toEqual(
      screen.getAllByRole("region"),
    );
  });

  it("agrupa los equipos, encadena el scroll con la página y conserva el acceso por teclado", () => {
    renderSedeAccordionRow();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar equipos de Central" }));

    const equiposRegion = screen.getByRole("region", { name: "Equipos de Central" });
    const equipoControls = within(equiposRegion).getAllByRole("button", {
      name: /Mostrar contenido de/,
    });

    expect(equipoControls).toHaveLength(equipos.length);
    expect(equiposRegion).toHaveAttribute("aria-labelledby");
    expect(equiposRegion).toHaveAttribute("tabindex", "0");
    expect(equiposRegion).toHaveClass("overscroll-y-auto");
    expect(equiposRegion).not.toHaveClass("overscroll-contain");

    equiposRegion.focus();

    expect(equiposRegion).toHaveFocus();
  });

  it("muestra el texto Editar en el botón de editar equipo y conserva su callback", () => {
    const { props } = renderSedeAccordionRow();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar equipos de Central" }));

    const editEquipoButton = screen.getByRole("button", { name: "Editar equipo Juvenil A" });
    expect(within(editEquipoButton).getByText("Editar")).toBeVisible();

    fireEvent.click(editEquipoButton);

    expect(props.onEditEquipo).toHaveBeenCalledWith(equipo);
  });

  it("solo conecta los controles con paneles que están montados", () => {
    renderSedeAccordionRow();

    const sedeControl = screen.getByRole("button", { name: "Mostrar equipos de Central" });
    expect(sedeControl).toHaveAttribute("aria-expanded", "false");
    expect(sedeControl).not.toHaveAttribute("aria-controls");
    expect(document.getElementById("sede-equipos-sede-central")).not.toBeInTheDocument();

    fireEvent.click(sedeControl);

    const equiposRegion = screen.getByRole("region", { name: "Equipos de Central" });
    expect(sedeControl).toHaveAttribute("aria-expanded", "true");
    expect(sedeControl).toHaveAttribute("aria-controls", equiposRegion.id);

    const equipoControl = screen.getByRole("button", { name: "Mostrar contenido de Juvenil A" });
    expect(equipoControl).toHaveAttribute("aria-expanded", "false");
    expect(equipoControl).not.toHaveAttribute("aria-controls");
    expect(document.getElementById("equipo-sesiones-equipo-juvenil-a")).not.toBeInTheDocument();
    expect(document.getElementById("equipo-miembros-equipo-juvenil-a")).not.toBeInTheDocument();

    fireEvent.click(equipoControl);

    const sesionesRegion = screen.getByRole("region", { name: "Sesiones de Juvenil A" });
    const miembrosRegion = screen.getByRole("region", { name: "Miembros de Juvenil A" });
    expect(equipoControl).toHaveAttribute("aria-expanded", "true");
    expect(equipoControl).toHaveAttribute("aria-controls", `${sesionesRegion.id} ${miembrosRegion.id}`);
  });

  it("mantiene los miembros largos en una colección enfocables y conserva sus callbacks", async () => {
    const { props } = renderSedeAccordionRow();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar equipos de Central" }));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contenido de Juvenil A" }));

    const miembrosRegion = screen.getByRole("region", { name: "Miembros de Juvenil A" });
    const miembrosCollection = screen.getByRole("region", { name: "Lista de miembros de Juvenil A" });

    expect(miembrosRegion).toContainElement(miembrosCollection);
    expect(within(miembrosCollection).getAllByRole("button", { name: /Editar (entrenador|jugador)/ })).toHaveLength(
      entrenadores.length + jugadores.length,
    );
    expect(within(miembrosCollection).getAllByText(/^(Entrenador|Jugador)$/).map((role) => role.textContent)).toEqual([
      ...entrenadores.map(() => "Entrenador"),
      ...jugadores.map(() => "Jugador"),
    ]);
    expect(miembrosCollection).toHaveAttribute("tabindex", "0");
    expect(miembrosCollection).toHaveClass("overscroll-y-auto");
    expect(miembrosCollection).not.toHaveClass("overscroll-contain");

    miembrosCollection.focus();

    expect(miembrosCollection).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Editar equipo Juvenil A" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar entrenador Ana Pérez" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar jugador Leo Ruiz" }));

    expect(props.onEditEquipo).toHaveBeenCalledWith(equipo);
    expect(props.onEditEntrenador).toHaveBeenCalledWith(entrenador);
    expect(props.onEditJugador).toHaveBeenCalledWith(jugador);
  });
});
