import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SesionForm } from "@/components/sesiones/SesionForm";
import { useEquiposLookup } from "@/hooks/useEquiposLookup";
import { useEntrenadoresLookupBySedes } from "@/hooks/useEntrenadoresLookupBySedes";
import { queryKeys } from "@/hooks/queryKeys";
import { fetchEjercicios, fetchEjerciciosForSesion } from "@/services/ejercicios.service";
import { fetchDocumentosDisponibles } from "@/services/documentos.service";
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
const EJERCICIO_ID = "33333333-3333-4333-8333-333333333333";
const EJERCICIO_CROSS_SEDE_ID = "55555555-5555-4555-8555-555555555555";
const WORKSPACE_ID = "44444444-4444-4444-8444-444444444444";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock("@/hooks/useEquiposLookup", () => ({
  useEquiposLookup: vi.fn(),
}));

vi.mock("@/hooks/useEntrenadoresLookupBySedes", () => ({
  useEntrenadoresLookupBySedes: vi.fn(),
}));

vi.mock("@/hooks/useQuery", () => ({
  useQuery: (queryFn: unknown, queryKey: readonly unknown[]) => useQueryMock(queryFn, queryKey),
}));

vi.mock("@/services/ejercicios.service", () => ({
  fetchEjercicios: vi.fn(),
  fetchEjerciciosForSesion: vi.fn(),
}));

vi.mock("@/services/documentos.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/documentos.service")>()),
  fetchDocumentosDisponibles: vi.fn().mockResolvedValue({ data: [], error: null }),
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
        ejercicioId: EJERCICIO_ID,
        documentoId: null,
        orden: 1,
      }])}
    >
      Añadir bloque de prueba
    </button>
  ),
}));

const { pendingMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
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

const EJERCICIO_DISPONIBLE = {
  id: EJERCICIO_ID,
  titulo: "Rondo disponible",
  objetivoPrincipal: null,
  numeroJugadoresMin: null,
  sedePropietariaId: null,
  esGlobal: true,
  documentoIds: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const EJERCICIO_CROSS_SEDE = {
  ...EJERCICIO_DISPONIBLE,
  id: EJERCICIO_CROSS_SEDE_ID,
  titulo: "Rondo de la sede B",
  sedePropietariaId: "sede-b",
  esGlobal: false,
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

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
  beforeEach(() => {
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
    vi.mocked(fetchSesionBloques).mockReset();
    vi.mocked(fetchSesionBloques).mockResolvedValue({
      data: { bloques: [], source: "legacy-draft", isExecutable: false },
      error: null,
    });
    vi.mocked(replaceSesionBloques).mockReset();
    vi.mocked(replaceSesionBloques).mockResolvedValue({ data: [], error: null });
    vi.mocked(fetchEjercicios).mockReset();
    vi.mocked(fetchEjercicios).mockResolvedValue({ data: [EJERCICIO_DISPONIBLE], error: null });
    vi.mocked(fetchEjerciciosForSesion).mockReset();
    vi.mocked(fetchEjerciciosForSesion).mockResolvedValue({
      data: [EJERCICIO_DISPONIBLE, EJERCICIO_CROSS_SEDE],
      error: null,
    });
    vi.mocked(fetchDocumentosDisponibles).mockReset();
    vi.mocked(fetchDocumentosDisponibles).mockResolvedValue({ data: [], error: null });
    useQueryMock.mockReset();
    useQueryMock.mockImplementation((_queryFn: unknown, queryKey: readonly unknown[]) => ({
      data: queryKey[0] === "ejercicios"
        ? queryKey[1] === "session-lookup"
          ? [EJERCICIO_DISPONIBLE, EJERCICIO_CROSS_SEDE]
          : [EJERCICIO_DISPONIBLE]
        : [],
      count: null,
      loading: false,
      errorMessage: null,
      refetch: vi.fn(),
    }));
  });

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
        workspaceId={WORKSPACE_ID}
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
        workspaceId={WORKSPACE_ID}
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
        workspaceId={WORKSPACE_ID}
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
        workspaceId={WORKSPACE_ID}
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

  it("modo creación: mantiene una sola operación hasta guardar los bloques de una sesión única", async () => {
    mockLookupsConEquipoYEntrenador();
    const createRequest = deferred<Sesion>();
    const saveBlocksRequest = deferred<{ data: []; error: null }>();
    const onSubmit = vi.fn().mockReturnValue(createRequest.promise);
    vi.mocked(replaceSesionBloques).mockReturnValue(saveBlocksRequest.promise);
    const { baseElement } = render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
      />,
    );

    await waitFor(() => expect(screen.getByText("Equipo A")).toBeInTheDocument());
    const fechaInput = baseElement.querySelector('input[type="date"]');
    if (!fechaInput) throw new Error("No se encontró la fecha de creación");
    fireEvent.change(fechaInput, { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: /añadir bloque de prueba/i }));
    const submitButton = screen.getByRole("button", { name: /^guardar$/i });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);

    createRequest.resolve(CREATED_SESION);
    await waitFor(() => expect(replaceSesionBloques).toHaveBeenCalledTimes(1));
    fireEvent.click(submitButton);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    saveBlocksRequest.resolve({ data: [], error: null });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("modo edición: conserva el diálogo y no guarda bloques si falla la actualización", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(replaceSesionBloques).mockClear();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{
          id: "bloque-1",
          sesionId: CREATED_SESION.id,
          titulo: "Activación",
          duracionMinutos: 15,
          ejercicioId: "33333333-3333-4333-8333-333333333333",
          ejercicioTitulo: "Rondo 4x1 básico",
          documentoId: null,
          notas: null,
          orden: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        }],
        source: "blocks",
        isExecutable: true,
      },
      error: null,
    });
    const onSubmit = vi.fn().mockResolvedValue(null);
    const onOpenChange = vi.fn();
    render(
      <SesionForm
        open
        onOpenChange={onOpenChange}
        title="Editar sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    expect(await screen.findByText("Duración total: 15 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText(/no se pudieron guardar los cambios de la sesión/i)).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(replaceSesionBloques).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("modo edición: guarda un bloque con título y duración pero sin ejercicio, recurso ni notas", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{ id: "legacy-1", titulo: "Rondo", duracionMinutos: 15, ejercicioId: null, documentoId: null, notas: null, orden: 1 }],
        source: "legacy-draft",
        isExecutable: false,
      },
      error: null,
    });
    const onSubmit = vi.fn().mockResolvedValue(CREATED_SESION);
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Editar sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    expect(await screen.findByText("Duración total: 15 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(replaceSesionBloques).toHaveBeenCalledWith(CREATED_SESION.id, [{
      titulo: "Rondo",
      duracionMinutos: 15,
      ejercicioId: null,
      documentoId: null,
      notas: null,
      orden: 1,
    }]);
  });

  it("modo edición: impide guardar un bloque sin título aunque tenga duración", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{ id: "legacy-1", titulo: "", duracionMinutos: 15, ejercicioId: null, documentoId: null, notas: null, orden: 1 }],
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
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    expect(await screen.findByText("Duración total: 15 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText(/cada bloque necesita título y duración/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(replaceSesionBloques).not.toHaveBeenCalled();
  });

  it("modo edición: impide guardar un ejercicio legacy fuera del workspace", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{
          id: "legacy-1",
          titulo: "Rondo",
          duracionMinutos: 15,
          ejercicioId: "ejercicio-otro-workspace",
          documentoId: null,
          notas: null,
          orden: 1,
        }],
        source: "legacy-draft",
        isExecutable: false,
      },
      error: null,
    });
    const onSubmit = vi.fn().mockResolvedValue(CREATED_SESION);
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Editar sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    expect(await screen.findByText("Duración total: 15 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    expect(await screen.findByText(/el ejercicio del bloque 1 no está disponible/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(replaceSesionBloques).not.toHaveBeenCalled();
  });

  it("modo edición: conserva y guarda un ejercicio de otra sede del mismo workspace", async () => {
    mockLookupsConEquipoYEntrenador();
    vi.mocked(fetchSesionBloques).mockResolvedValueOnce({
      data: {
        bloques: [{
          id: "bloque-cross-sede",
          sesionId: CREATED_SESION.id,
          titulo: "Activación",
          duracionMinutos: 15,
          ejercicioId: EJERCICIO_CROSS_SEDE_ID,
          ejercicioTitulo: "Ejercicio de otra sede",
          documentoId: null,
          notas: null,
          orden: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
        }],
        source: "blocks",
        isExecutable: true,
      },
      error: null,
    });
    const onSubmit = vi.fn().mockResolvedValue(CREATED_SESION);
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Editar sesión"
        sedeIds={["sede-a"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={onSubmit}
        initialValue={{ ...CREATED_SESION, fecha: "2026-07-10" }}
      />,
    );

    const ejerciciosCall = useQueryMock.mock.calls.find(
      ([, queryKey]) => Array.isArray(queryKey) && queryKey[0] === "ejercicios",
    );
    expect(ejerciciosCall?.[1]).toEqual(queryKeys.ejercicios.sessionLookup(WORKSPACE_ID));
    await ejerciciosCall?.[0]();
    expect(fetchEjerciciosForSesion).toHaveBeenCalledWith(WORKSPACE_ID);

    expect(await screen.findByText("Duración total: 15 min")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(replaceSesionBloques).toHaveBeenCalledWith(CREATED_SESION.id, [{
      titulo: "Activación",
      duracionMinutos: 15,
      ejercicioId: EJERCICIO_CROSS_SEDE_ID,
      documentoId: null,
      notas: null,
      orden: 1,
    }]);
  });

  it("consulta los documentos disponibles con sede y workspace, con clave aislada por tenant", async () => {
    render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
        onSubmit={vi.fn()}
      />,
    );

    const documentosCall = useQueryMock.mock.calls.find(
      ([, queryKey]) => Array.isArray(queryKey) && queryKey[0] === "documentos",
    );
    expect(documentosCall?.[1]).toEqual(
      queryKeys.documentos.available(WORKSPACE_ID, ["sede-1"]),
    );
    await documentosCall?.[0]();
    expect(fetchDocumentosDisponibles).toHaveBeenCalledWith(["sede-1"], WORKSPACE_ID);
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
        workspaceId={WORKSPACE_ID}
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

  it("modo creación: mantiene una sola operación repetida hasta persistir todos los bloques", async () => {
    mockLookupsConEquipoYEntrenador();
    const createRequest = deferred<Sesion[]>();
    const saveBlocksRequest = deferred<{ data: []; error: null }>();
    const onSubmitBulk = vi.fn().mockReturnValue(createRequest.promise);
    vi.mocked(replaceSesionBloques).mockReturnValue(saveBlocksRequest.promise);
    const { baseElement } = render(
      <SesionForm
        open
        onOpenChange={vi.fn()}
        title="Nueva sesión"
        sedeIds={["sede-1"]}
        workspaceId={WORKSPACE_ID}
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
    const submitButton = screen.getByRole("button", { name: /crear 1 sesiones/i });

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    await waitFor(() => expect(onSubmitBulk).toHaveBeenCalledTimes(1));
    expect(runMock).toHaveBeenCalledTimes(1);

    createRequest.resolve([CREATED_SESION]);
    await waitFor(() => expect(replaceSesionBloques).toHaveBeenCalledTimes(1));
    fireEvent.click(submitButton);
    expect(onSubmitBulk).toHaveBeenCalledTimes(1);

    saveBlocksRequest.resolve({ data: [], error: null });
    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});
