import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Documento } from "@/types/documentos";
import type { Sesion } from "@/types/sesiones";

const sesionMocks = vi.hoisted(() => ({ useSesion: vi.fn(), useSesiones: vi.fn() }));
const bloqueMocks = vi.hoisted(() => ({ useSesionBloques: vi.fn() }));
const documentoMocks = vi.hoisted(() => ({ useDocumentos: vi.fn() }));
const lookupMocks = vi.hoisted(() => ({
  useEquiposLookup: vi.fn(),
  useEntrenadoresLookupByWorkspace: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({ useAuth: vi.fn() }));
const workspaceMocks = vi.hoisted(() => ({ useWorkspaceContext: vi.fn() }));
const resourceMocks = vi.hoisted(() => ({ getDocumentoOpenUrl: vi.fn() }));

vi.mock("@/hooks/useSesiones", () => sesionMocks);
vi.mock("@/hooks/useSesionBloques", () => bloqueMocks);
vi.mock("@/hooks/useDocumentos", () => documentoMocks);
vi.mock("@/hooks/useEquiposLookup", () => ({ useEquiposLookup: lookupMocks.useEquiposLookup }));
vi.mock("@/hooks/useEntrenadoresLookupByWorkspace", () => ({
  useEntrenadoresLookupByWorkspace: lookupMocks.useEntrenadoresLookupByWorkspace,
}));
vi.mock("@/hooks/useAuth", () => authMocks);
vi.mock("@/lib/workspaceContext", () => workspaceMocks);
vi.mock("@/services/documentos.service", () => resourceMocks);
vi.mock("@/components/sesiones/SesionForm", () => ({ SesionForm: () => null }));
vi.mock("@/components/shared/ConfirmDialog", () => ({ ConfirmDialog: () => null }));

const sesion: Sesion = {
  id: "sesion-1",
  fecha: "2026-08-09",
  horaInicio: null,
  duracionEstimada: 15,
  equipoId: "equipo-1",
  entrenadorIds: [],
  microciclo: null,
  periodoTemporada: null,
  objetivoSesion: null,
  observacionesPrevias: null,
  feedbackPostEntreno: null,
  estado: "Planificada",
  createdAt: "",
  updatedAt: "",
};

const documento: Documento = {
  id: "documento-1",
  contentAssetId: null,
  titulo: "Guía de activación",
  categoriaDoc: "Vídeo",
  driveFileId: null,
  storagePath: null,
  fileName: null,
  mimeType: null,
  sizeBytes: null,
  extension: null,
  sourceType: "link",
  externalUrl: "https://example.test/activacion",
  sedeId: "sede-1",
  sedeIds: ["sede-1"],
  equipoIds: [],
  workspaceId: "workspace-1",
  visibleEntrenadores: true,
  entrenadorIds: [],
  createdAt: "",
  updatedAt: "",
};

function setReadyData() {
  sesionMocks.useSesion.mockReturnValue({ data: sesion, loading: false, errorMessage: null });
  sesionMocks.useSesiones.mockReturnValue({ data: [sesion], loading: false, errorMessage: null });
  bloqueMocks.useSesionBloques.mockReturnValue({
    data: {
      source: "blocks",
      isExecutable: true,
      bloques: [
        { id: "bloque-1", sesionId: sesion.id, titulo: "Activación", duracionMinutos: 10, ejercicioId: "ejercicio-1", ejercicioTitulo: "Rondo 4x1 básico", documentoId: documento.id, notas: null, orden: 1, createdAt: "" },
        { id: "bloque-2", sesionId: sesion.id, titulo: "Parte principal", duracionMinutos: 5, ejercicioId: "ejercicio-2", ejercicioTitulo: "Rueda de pases", documentoId: null, notas: null, orden: 2, createdAt: "" },
      ],
    },
    loading: false,
    errorMessage: null,
  });
  documentoMocks.useDocumentos.mockReturnValue({ data: [documento], loading: false, errorMessage: null });
}

describe("SesionEjecutarView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    window.localStorage.clear();
    authMocks.useAuth.mockReturnValue({ loading: false, session: null, user: { id: "usuario-1" } });
    workspaceMocks.useWorkspaceContext.mockReturnValue({
      activeSede: { id: "sede-1", nombre: "Sede" },
      activeWorkspaceId: "workspace-1",
      rol: "entrenador",
    });
    resourceMocks.getDocumentoOpenUrl.mockResolvedValue({ data: documento.externalUrl, error: null });
    lookupMocks.useEquiposLookup.mockReturnValue({ data: [] });
    lookupMocks.useEntrenadoresLookupByWorkspace.mockReturnValue({ data: [] });
    setReadyData();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("muestra estados remotos antes de montar una ejecución sin bloques válidos", async () => {
    bloqueMocks.useSesionBloques.mockReturnValue({ data: null, loading: true, errorMessage: null });
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    const view = render(<SesionEjecutarView sesionId={sesion.id} />);

    expect(screen.getByText("Cargando ejecución de la sesión…")).toBeInTheDocument();
    view.unmount();

    bloqueMocks.useSesionBloques.mockReturnValue({
      data: { source: "legacy-draft", isExecutable: false, bloques: [] },
      loading: false,
      errorMessage: null,
    });
    render(<SesionEjecutarView sesionId={sesion.id} />);

    expect(screen.getByText(/no tiene bloques ejecutables/i)).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("carga la sesión conocida directamente por id y workspace para entrenador", async () => {
    bloqueMocks.useSesionBloques.mockReturnValue({ data: null, loading: true, errorMessage: null });
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    expect(sesionMocks.useSesion).toHaveBeenCalledWith(sesion.id, "workspace-1");
    expect(sesionMocks.useSesiones).not.toHaveBeenCalled();
  });

  it("deniega a jugador antes de cargar contenido sensible del runner", async () => {
    workspaceMocks.useWorkspaceContext.mockReturnValue({
      activeSede: { id: "sede-1", nombre: "Sede" },
      activeWorkspaceId: "workspace-1",
      rol: "jugador",
    });
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    expect(screen.getByText("No tienes permiso para ejecutar esta sesión.")).toBeInTheDocument();
    expect(sesionMocks.useSesion).toHaveBeenCalledWith(null, null);
    expect(bloqueMocks.useSesionBloques).toHaveBeenCalledWith(null);
    expect(documentoMocks.useDocumentos).toHaveBeenCalledWith([], null);
  });

  it("enlaza Ejecutar entre las acciones autorizadas y la página espera los params de Next 16", async () => {
    const { SesionesListView } = await import("@/components/sesiones/SesionesListView");
    const page = await import("@/app/(dashboard)/sesiones/[sesionId]/ejecutar/page");
    const list = render(<SesionesListView />);

    const executeLinks = screen.getAllByRole("link", { name: /ejecutar/i });
    expect(executeLinks).toHaveLength(2);
    executeLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/sesiones/sesion-1/ejecutar");
    });
    await expect(page.default({ params: Promise.resolve({ sesionId: sesion.id }) })).resolves.toMatchObject({
      props: { sesionId: sesion.id },
    });

    list.unmount();
    workspaceMocks.useWorkspaceContext.mockReturnValue({
      activeSede: { id: "sede-1", nombre: "Sede" },
      activeWorkspaceId: "workspace-1",
      rol: "jugador",
    });
    render(<SesionesListView />);
    expect(screen.queryByRole("link", { name: /ejecutar/i })).not.toBeInTheDocument();
  });

  it("permite saltar un bloque preparado sin iniciarlo y solo Play inicia el temporizador", async () => {
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("timer", { name: /tiempo restante de activación/i })).toHaveTextContent("10:00");
    expect(screen.getByRole("button", { name: /previsualizar activación/i })).toHaveTextContent("Preparado");
    expect(screen.getByRole("button", { name: /^saltar$/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /^saltar$/i }));
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^pausa$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("timer", { name: /tiempo restante de parte principal/i })).toHaveTextContent("5:00");
    expect(screen.getByRole("button", { name: /previsualizar parte principal/i })).toHaveTextContent("Preparado");

    fireEvent.click(screen.getByRole("button", { name: /anterior bloque/i }));
    expect(screen.getByText("Previsualizando")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activación" })).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: /tiempo restante de parte principal/i })).toHaveTextContent("5:00");

    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    expect(screen.getByRole("button", { name: /^pausa$/i })).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: /tiempo restante de activación/i })).toHaveTextContent("10:00");

    fireEvent.click(screen.getByRole("button", { name: /^saltar$/i }));
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
  });

  it("resalta en verde el bloque activo en la lista aunque se previsualice otro", async () => {
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole("button", { name: /previsualizar activación/i })).toHaveClass("bg-success");
    expect(screen.getByRole("button", { name: /previsualizar parte principal/i })).not.toHaveClass("bg-success");

    fireEvent.click(screen.getByRole("button", { name: /previsualizar parte principal/i }));

    expect(screen.getByRole("button", { name: /previsualizar activación/i })).toHaveClass("bg-success");
    expect(screen.getByRole("button", { name: /previsualizar parte principal/i })).not.toHaveClass("bg-success");
  });

  it("marca en verde la previsualización cuando muestra el bloque en ejecución", async () => {
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("Bloque activo: Activación")).toHaveClass("text-success");
    expect(screen.getByRole("region", { name: "Activación" })).toHaveClass("border-success");

    fireEvent.click(screen.getByRole("button", { name: /previsualizar parte principal/i }));

    expect(screen.getByText("Bloque activo: Activación")).toHaveClass("text-success");
    expect(screen.getByRole("region", { name: "Parte principal" })).not.toHaveClass("border-success");
  });

  it("abre el documento del bloque visto de forma segura sin iniciar la ejecución", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Guía de activación")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /abrir documento/i }));
      await Promise.resolve();
    });
    expect(open).toHaveBeenCalledWith(documento.externalUrl, "_blank", "noopener,noreferrer");
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    open.mockRestore();
  });

  it("muestra el ejercicio del bloque previsualizado y lo actualiza al navegar", async () => {
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Ejercicio: Rondo 4x1 básico")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente bloque" }));

    expect(screen.getByText("Ejercicio: Rueda de pases")).toBeInTheDocument();
    expect(screen.queryByText("Ejercicio: Rondo 4x1 básico")).not.toBeInTheDocument();
  });

  it("no muestra la línea de ejercicio cuando el bloque no tiene título de ejercicio", async () => {
    bloqueMocks.useSesionBloques.mockReturnValue({
      data: {
        source: "blocks",
        isExecutable: true,
        bloques: [
          { id: "bloque-1", sesionId: sesion.id, titulo: "Activación", duracionMinutos: 10, ejercicioId: "ejercicio-1", ejercicioTitulo: null, documentoId: null, notas: null, orden: 1, createdAt: "" },
        ],
      },
      loading: false,
      errorMessage: null,
    });
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.queryByText(/^Ejercicio:/)).not.toBeInTheDocument();
  });

  it("muestra las notas del bloque previsualizado cuando existen y las oculta cuando no hay", async () => {
    bloqueMocks.useSesionBloques.mockReturnValue({
      data: {
        source: "blocks",
        isExecutable: true,
        bloques: [
          { id: "bloque-1", sesionId: sesion.id, titulo: "Activación", duracionMinutos: 10, ejercicioId: "ejercicio-1", ejercicioTitulo: "Rondo 4x1 básico", documentoId: null, notas: "Estiramientos guiados", orden: 1, createdAt: "" },
          { id: "bloque-2", sesionId: sesion.id, titulo: "Parte principal", duracionMinutos: 5, ejercicioId: "ejercicio-2", ejercicioTitulo: "Rueda de pases", documentoId: null, notas: null, orden: 2, createdAt: "" },
        ],
      },
      loading: false,
      errorMessage: null,
    });
    const { SesionEjecutarView } = await import("@/components/sesiones/SesionEjecutarView");
    render(<SesionEjecutarView sesionId={sesion.id} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Estiramientos guiados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente bloque" }));

    expect(screen.queryByText("Estiramientos guiados")).not.toBeInTheDocument();
  });
});
