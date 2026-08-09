import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import { ESTADO_SESION, PERIODO_TEMPORADA } from "@/lib/constants";

const useSesionesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({
    sedesDisponibles: [
      { id: "sede-norte", nombre: "Sede Norte" },
      { id: "sede-sur", nombre: "Sede Sur" },
    ],
  }),
}));

vi.mock("@/hooks/useSesiones", () => ({
  useSesiones: useSesionesMock,
}));

vi.mock("@/hooks/useEquiposLookup", () => ({
  useEquiposLookup: () => ({ data: [{ id: "equipo-juvenil", nombre: "Juvenil A" }] }),
}));

vi.mock("@/hooks/useUsuariosLookup", () => ({
  useUsuariosLookup: () => ({ data: [] }),
}));

vi.mock("@/components/shared/MultiSelect", () => ({
  MultiSelect: ({
    allLabel,
    onChange,
    options,
  }: {
    allLabel: string;
    onChange: (value: string[]) => void;
    options: { value: string }[];
  }) => (
    <button type="button" onClick={() => onChange([options[0]!.value])}>
      {allLabel}
    </button>
  ),
}));

vi.mock("@/components/sesiones/SesionDetalleDialog", () => ({
  SesionDetalleDialog: ({ open, equipoNombre }: { open: boolean; equipoNombre: string }) =>
    open ? <div role="dialog">Sesión · {equipoNombre}</div> : null,
}));

describe("dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-08T12:00:00"));
    useSesionesMock.mockReturnValue({
      data: [
        {
          id: "sesion-juvenil",
          fecha: "2026-08-08",
          horaInicio: "18:30:00",
          duracionEstimada: 90,
          equipoId: "equipo-juvenil",
          entrenadorIds: [],
          microciclo: null,
          periodoTemporada: PERIODO_TEMPORADA.COMPETICION,
          objetivoSesion: "Táctica ofensiva",
          observacionesPrevias: null,
          feedbackPostEntreno: null,
          estado: ESTADO_SESION.PLANIFICADA,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: "sesion-juvenil-17",
          fecha: "2026-08-17",
          horaInicio: "18:30:00",
          duracionEstimada: 90,
          equipoId: "equipo-juvenil",
          entrenadorIds: [],
          microciclo: null,
          periodoTemporada: PERIODO_TEMPORADA.COMPETICION,
          objetivoSesion: "Salida de balón",
          observacionesPrevias: null,
          feedbackPostEntreno: null,
          estado: ESTADO_SESION.PLANIFICADA,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      loading: false,
      updateOne: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("aplica el filtro de sede y abre el detalle de la sesión seleccionada", () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Sedes" }));
    expect(useSesionesMock).toHaveBeenLastCalledWith(["sede-norte"]);

    fireEvent.click(screen.getByRole("button", { name: /Juvenil A/i }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Sesión · Juvenil A");
  });

  it("muestra el rango semanal una sola vez", () => {
    render(<DashboardPage />);

    expect(screen.getAllByText("3–9 Ago 2026")).toHaveLength(1);
  });

  it("no muestra el subtítulo redundante del panel", () => {
    render(<DashboardPage />);

    expect(
      screen.queryByText("Sesiones del club ordenadas por fecha y hora"),
    ).not.toBeInTheDocument();
  });

  it("mantiene los siete días en una sola fila", () => {
    render(<DashboardPage />);

    const weekDays = screen.getByLabelText("Días de la semana");
    expect(weekDays).toHaveClass("grid-cols-7");
    expect(within(weekDays).getAllByRole("button")).toHaveLength(7);
  });

  it("incluye en el mes sesiones que están fuera de la semana activa", () => {
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole("button", { name: "Ver calendario mensual" }));

    expect(
      screen.getByRole("button", {
        name: /lunes, 17 de agosto de 2026, 1 sesión/i,
      }),
    ).toBeVisible();
  });

  it("actualiza la semana y el encabezado de sesiones al elegir una fecha", () => {
    render(<DashboardPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "Elegir fecha: 3–9 Ago 2026" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /17 de agosto de 2026/i }),
    );

    expect(
      screen.getByRole("button", { name: "Elegir fecha: 17–23 Ago 2026" }),
    ).toBeVisible();
    expect(screen.getByText(/lunes, 17 de agosto de 2026/i)).toBeVisible();
  });
});
