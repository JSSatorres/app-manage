import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SesionesEquipoList } from "@/components/sedes/SesionesEquipoList";
import { ESTADO_SESION } from "@/lib/constants";
import type { Sesion } from "@/types/sesiones";

const queryState = vi.hoisted(() => ({
  data: null as unknown,
  loading: false,
  executeQuery: false,
}));

const fetchSesionesByEquipoId = vi.hoisted(() => vi.fn(() => Promise.resolve({ data: null, error: null })));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: (queryFn: () => Promise<unknown>) => {
    if (queryState.executeQuery) {
      void queryFn();
    }

    return {
      data: queryState.data,
      loading: queryState.loading,
      errorMessage: null,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@/services/sesiones.service", () => ({ fetchSesionesByEquipoId }));

function createSesion(overrides: Partial<Sesion>): Sesion {
  return {
    id: "sesion-1",
    fecha: "2026-08-08",
    horaInicio: "18:30:00",
    duracionEstimada: 90,
    equipoId: "equipo-juvenil-a",
    entrenadorIds: [],
    microciclo: null,
    periodoTemporada: null,
    objetivoSesion: null,
    observacionesPrevias: null,
    feedbackPostEntreno: null,
    estado: ESTADO_SESION.BORRADOR,
    createdAt: "2026-08-08T00:00:00.000Z",
    updatedAt: "2026-08-08T00:00:00.000Z",
    ...overrides,
  };
}

const sesionesBase = [
  createSesion({ id: "sesion-borrador", estado: ESTADO_SESION.BORRADOR }),
  createSesion({ id: "sesion-planificada", fecha: "2026-08-09", estado: ESTADO_SESION.PLANIFICADA }),
  createSesion({ id: "sesion-realizada", fecha: "2026-08-10", estado: ESTADO_SESION.REALIZADA }),
  createSesion({ id: "sesion-no-realizada", fecha: "2026-08-11", estado: ESTADO_SESION.NO_REALIZADA }),
];

const sesiones = [
  ...sesionesBase,
  ...Array.from({ length: 8 }, (_, index) =>
    createSesion({
      id: `sesion-adicional-${index + 1}`,
      fecha: `2026-08-${String(index + 12).padStart(2, "0")}`,
      estado: sesionesBase[index % sesionesBase.length].estado,
    }),
  ),
];

describe("SesionesEquipoList", () => {
  beforeEach(() => {
    queryState.data = sesiones;
    queryState.loading = false;
    queryState.executeQuery = false;
  });

  afterEach(() => {
    cleanup();
    fetchSesionesByEquipoId.mockClear();
  });

  it("expone texto visible y nombre accesible para cada estado de sesión", () => {
    render(<SesionesEquipoList equipoId="equipo-juvenil-a" open onEditSesion={vi.fn()} />);

    for (const estado of ["Borrador", "Planificada", "Realizada", "No realizada"]) {
      expect(screen.getAllByText(estado)[0]).toBeVisible();
      expect(screen.getAllByLabelText(`Estado: ${estado}`)[0]).toBeVisible();
    }
  });

  it("ofrece una edición contextual y entrega la misma sesión", () => {
    const onEditSesion = vi.fn();

    render(<SesionesEquipoList equipoId="equipo-juvenil-a" open onEditSesion={onEditSesion} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar sesión del 08/08" }));

    expect(onEditSesion).toHaveBeenCalledWith(sesiones[0]);
  });

  it("agrupa las sesiones largas, permite encadenar el scroll y mantiene el acceso por teclado", () => {
    render(<SesionesEquipoList equipoId="equipo-juvenil-a" open onEditSesion={vi.fn()} />);

    const sesionesRegion = screen.getByRole("region", { name: "Sesiones" });

    expect(screen.getAllByRole("button", { name: /Editar sesión del/ })).toHaveLength(sesiones.length);
    expect(sesionesRegion).toHaveAttribute("tabindex", "0");
    expect(sesionesRegion).toHaveClass("overscroll-y-auto");
    expect(sesionesRegion).not.toHaveClass("overscroll-contain");

    sesionesRegion.focus();

    expect(sesionesRegion).toHaveFocus();
  });

  it("mantiene nombres de región únicos por equipo en datos, carga y vacío", () => {
    const { rerender } = render(
      <>
        <SesionesEquipoList equipoId="equipo-juvenil-a" equipoNombre="Juvenil A" open onEditSesion={vi.fn()} />
        <SesionesEquipoList equipoId="equipo-cadete-b" equipoNombre="Cadete B" open onEditSesion={vi.fn()} />
      </>,
    );

    for (const nombreEquipo of ["Juvenil A", "Cadete B"]) {
      expect(screen.getByRole("region", { name: `Lista de sesiones de ${nombreEquipo}` })).toBeVisible();
    }

    queryState.loading = true;
    rerender(
      <>
        <SesionesEquipoList equipoId="equipo-juvenil-a" equipoNombre="Juvenil A" open onEditSesion={vi.fn()} />
        <SesionesEquipoList equipoId="equipo-cadete-b" equipoNombre="Cadete B" open onEditSesion={vi.fn()} />
      </>,
    );

    for (const nombreEquipo of ["Juvenil A", "Cadete B"]) {
      expect(screen.getByRole("region", { name: `Lista de sesiones de ${nombreEquipo}` })).toBeVisible();
    }

    queryState.loading = false;
    queryState.data = [];
    rerender(
      <>
        <SesionesEquipoList equipoId="equipo-juvenil-a" equipoNombre="Juvenil A" open onEditSesion={vi.fn()} />
        <SesionesEquipoList equipoId="equipo-cadete-b" equipoNombre="Cadete B" open onEditSesion={vi.fn()} />
      </>,
    );

    for (const nombreEquipo of ["Juvenil A", "Cadete B"]) {
      expect(screen.getByRole("region", { name: `Lista de sesiones de ${nombreEquipo}` })).toBeVisible();
    }
  });

  it("no renderiza ni inicia la consulta real cuando está cerrado", () => {
    queryState.executeQuery = true;

    const { container } = render(
      <SesionesEquipoList equipoId="equipo-juvenil-a" open={false} onEditSesion={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(fetchSesionesByEquipoId).not.toHaveBeenCalled();
  });

  it("anuncia la carga de sesiones", () => {
    queryState.loading = true;

    render(<SesionesEquipoList equipoId="equipo-juvenil-a" open onEditSesion={vi.fn()} />);

    const sesionesRegion = screen.getByRole("region", { name: "Sesiones" });

    expect(sesionesRegion).toHaveTextContent("Cargando sesiones...");
    expect(sesionesRegion).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("anuncia el estado vacío dentro de la región de sesiones", () => {
    queryState.data = [];

    render(<SesionesEquipoList equipoId="equipo-juvenil-a" open onEditSesion={vi.fn()} />);

    const sesionesRegion = screen.getByRole("region", { name: "Sesiones" });

    expect(sesionesRegion).toHaveTextContent("Sin sesiones");
    expect(sesionesRegion).toHaveAttribute("tabindex", "0");
  });
});
