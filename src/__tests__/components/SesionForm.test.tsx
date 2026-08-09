import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SesionForm } from "@/components/sesiones/SesionForm";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useEntrenadoresLookupBySedes } from "@/hooks/useEntrenadoresLookupBySedes";
import { fetchSesionBloques, replaceSesionBloques } from "@/services/sesion-bloques.service";
import type { Sesion } from "@/types/sesiones";

/**
 * Migración RHF + Zod (Task 3.1, Lote D). `createSesionSchema` (camelCase,
 * ver src/schemas/sesion.schema.ts) valida los campos "base" (equipo,
 * entrenadores, periodo, objetivo, observaciones, estado y, en edición,
 * fecha/hora/duración). El programador de fechas (rango + días de la semana)
 * no forma parte de la entidad `Sesion`, así que se valida aparte antes de
 * llamar a `onSubmitBulk`. Ver docs/plans/2026-07-12-auditoria-estado-y-roadmap.md.
 */

const EQUIPO_ID = "11111111-1111-4111-8111-111111111111";
const ENTRENADOR_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/hooks/useEquiposLookup", () => ({
  useEquiposLookup: vi.fn(),
}));

vi.mock("@/hooks/useEntrenadoresLookupBySedes", () => ({
  useEntrenadoresLookupBySedes: vi.fn(),
}));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: () => ({ data: [], count: null, loading: false, errorMessage: null, refetch: vi.fn() }),
}));

vi.mock("@/services/sesion-bloques.service", () => ({
  fetchSesionBloques: vi.fn().mockResolvedValue({ data: { bloques: [], source: "legacy-draft", isExecutable: false }, error: null }),
  replaceSesionBloques: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

vi.mock("@/components/sesiones/SesionBloquesEditor", () => ({
  SesionBloquesEditor: ({ onChange }: { onChange: (bloques: Array<unknown>) => void }) => (
    <button
      type="button"
      onClick={() => onChange([{
        id: "bloque-1",
        titulo: "Activación",
        duracionMinutos: 15,
        ejercicioId: "33333333-3333-4333-8333-333333333333",
        documentoId: null,
        orden: 1,
      }])}
    >
      Añadir bloque de prueba
    </button>
  ),
}));

const CREATED_SESION: Sesion = {
  id: "33333333-3333-4333-8333-333333333333",
  fecha: "2026-08-01",
  horaInicio: null,
  duracionEstimada: 15,
  equipoId: EQUIPO_ID,
  entrenadorIds: [ENTRENADOR_ID],
  microciclo: null,
  periodoTemporada: null,
  objetivoSesion: null,
  observacionesPrevias: null,
  feedbackPostEntreno: null,
  estado: "Borrador",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockLookupsEmpty() {
  vi.mocked(useEquiposLookup).mockReturnValue({
    data: [], loading: false, errorMessage: null, count: null, refetch: vi.fn(),
  });
  vi.mocked(useEntrenadoresLookupBySedes).mockReturnValue({
    data: [], loading: false, errorMessage: null, count: null, refetch: vi.fn(),
  });
}

function mockLookupsConEquipoYEntrenador() {
  vi.mocked(useEquiposLookup).mockReturnValue({
    data: [{ id: EQUIPO_ID, nombre: "Equipo A", entrenadorIds: [ENTRENADOR_ID] }],
    loading: false,
    errorMessage: null,
    count: null,
    refetch: vi.fn(),
  });
  vi.mocked(useEntrenadoresLookupBySedes).mockReturnValue({
    data: [{ id: ENTRENADOR_ID, nombre: "Carlos", apellidos: "Ruiz" }],
    loading: false,
    errorMessage: null,
    count: null,
    refetch: vi.fn(),
  });
}

describe("SesionForm", () => {
  it("modo creación: no llama a onSubmit/onSubmitBulk y muestra errores cuando faltan equipo y entrenadores", async () => {
    mockLookupsEmpty();
    const onSubmit = vi.fn().mockResolvedValue(CREATED_SESION);
    const onSubmitBulk = vi.fn();
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        onSubmit={onSubmit}
        onSubmitBulk={onSubmitBulk}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(await screen.findByText(/equipo requerido/i)).toBeInTheDocument();
    expect(await screen.findByText(/selecciona al menos un entrenador/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onSubmitBulk).not.toHaveBeenCalled();
  });

  it("modo creación: sesión única, llama a onSubmit con el payload correcto", async () => {
    mockLookupsConEquipoYEntrenador();
    const onSubmit = vi.fn();
    const { baseElement } = render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        onSubmit={onSubmit}
      />,
    );

    // El equipo y sus entrenadores se auto-seleccionan al abrir (mismo
    // comportamiento que la versión previa a la migración).
    await waitFor(() => expect(screen.getByText("Equipo A")).toBeInTheDocument());

    const fechaInputs = baseElement.querySelectorAll('input[type="date"]');
    fireEvent.change(fechaInputs[0], { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /añadir bloque de prueba/i }));

    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      fecha: "2026-08-01",
      horaInicio: null,
      duracionEstimada: 15,
      equipoId: EQUIPO_ID,
      entrenadorIds: [ENTRENADOR_ID],
      periodoTemporada: null,
      objetivoSesion: null,
      observacionesPrevias: null,
      estado: "Borrador",
    });
  });

  it("modo creación: repetición sin rango de fechas válido muestra error y no envía", async () => {
    mockLookupsConEquipoYEntrenador();
    const onSubmitBulk = vi.fn();
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        onSubmit={vi.fn()}
        onSubmitBulk={onSubmitBulk}
      />,
    );

    await waitFor(() => expect(screen.getByText("Equipo A")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Lun" }));
    fireEvent.click(screen.getByRole("button", { name: /añadir bloque de prueba/i }));
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText(/define un rango de fechas válido/i)).toBeInTheDocument();
    expect(onSubmitBulk).not.toHaveBeenCalled();
  });

  it("modo edición: precarga los valores y llama a onSubmit con el payload actualizado", async () => {
    mockLookupsConEquipoYEntrenador();
    const onSubmit = vi.fn().mockResolvedValue(CREATED_SESION);
    const { baseElement } = render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Editar sesión"
        sedeIds={["sede-1"]}
        onSubmit={onSubmit}
        initialValue={{
          id: "33333333-3333-4333-8333-333333333333",
          fecha: "2026-07-10",
          horaInicio: "18:00",
          duracionEstimada: 60,
          equipoId: EQUIPO_ID,
          entrenadorIds: [ENTRENADOR_ID],
          microciclo: null,
          periodoTemporada: null,
          objetivoSesion: "Resistencia",
          observacionesPrevias: null,
          feedbackPostEntreno: null,
          estado: "Planificada",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        }}
      />,
    );

    const fechaInput = () => baseElement.querySelector('#ses-fecha') as HTMLInputElement;
    await waitFor(() => expect(fechaInput()).toHaveValue("2026-07-10"));

    fireEvent.change(fechaInput(), { target: { value: "2026-07-15" } });
    fireEvent.click(screen.getByRole("button", { name: /añadir bloque de prueba/i }));
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      fecha: "2026-07-15",
      horaInicio: "18:00",
      duracionEstimada: 15,
      equipoId: EQUIPO_ID,
      entrenadorIds: [ENTRENADOR_ID],
      periodoTemporada: null,
      objetivoSesion: "Resistencia",
      observacionesPrevias: null,
      estado: "Planificada",
    });
  });

  it("modo edición: muestra el borrador legacy e impide guardar si falta la duración", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{ id: "legacy-1", titulo: "Rondo", duracionMinutos: null, ejercicioId: "33333333-3333-4333-8333-333333333333", documentoId: null, orden: 1 }],
        source: "legacy-draft",
        isExecutable: false,
      },
      error: null,
    });
    const onSubmit = vi.fn();
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Editar sesión"
        sedeIds={["sede-1"]}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    expect(await screen.findByText("Duración total: 0 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText(/completa al menos un bloque/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("no anuncia éxito total cuando falla guardar bloques de una sesión repetida", async () => {
    mockLookupsConEquipoYEntrenador();
    const secondSession = { ...CREATED_SESION, id: "44444444-4444-4444-8444-444444444444", fecha: "2026-08-08" };
    const onSubmitBulk = vi.fn().mockResolvedValue([CREATED_SESION, secondSession]);
    vi.mocked(replaceSesionBloques)
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("fallo") });
    const { baseElement } = render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        onSubmit={vi.fn()}
        onSubmitBulk={onSubmitBulk}
      />,
    );

    await waitFor(() => expect(screen.getByText("Equipo A")).toBeInTheDocument());
    const dateInputs = baseElement.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2026-08-01" } });
    fireEvent.change(dateInputs[1], { target: { value: "2026-08-08" } });
    fireEvent.click(screen.getByRole("button", { name: "Lun" }));
    fireEvent.click(screen.getByRole("button", { name: /añadir bloque de prueba/i }));
    fireEvent.click(screen.getByRole("button", { name: /crear 1 sesiones/i }));

    expect(await screen.findByText(/fallaron los bloques de: 2026-08-08/i)).toBeInTheDocument();
  });
});
