import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SesionesListView } from "@/components/sesiones/SesionesListView";
import type { Rol } from "@/lib/permisos";
import type { Sesion } from "@/types/sesiones";

const sesionMocks = vi.hoisted(() => ({ useSesiones: vi.fn() }));
const lookupMocks = vi.hoisted(() => ({
  useEquiposLookup: vi.fn(),
  useEntrenadoresLookupByWorkspace: vi.fn(),
}));
const workspaceMocks = vi.hoisted(() => ({ useWorkspaceContext: vi.fn() }));

vi.mock("@/hooks/useSesiones", () => sesionMocks);
vi.mock("@/hooks/useEquiposLookup", () => ({ useEquiposLookup: lookupMocks.useEquiposLookup }));
vi.mock("@/hooks/useEntrenadoresLookupByWorkspace", () => ({
  useEntrenadoresLookupByWorkspace: lookupMocks.useEntrenadoresLookupByWorkspace,
}));
vi.mock("@/lib/workspaceContext", () => workspaceMocks);
vi.mock("@/components/sesiones/SesionForm", () => ({
  SesionForm: ({ open }: { open: boolean }) => open ? <section role="dialog">Editor de sesiÃ³n</section> : null,
}));
vi.mock("@/components/shared/ConfirmDialog", () => ({ ConfirmDialog: () => null }));

const sesion: Sesion = {
  id: "sesion-movil-1",
  fecha: "2026-08-16",
  horaInicio: "18:30:00",
  duracionEstimada: 90,
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

function renderList(rol: Rol = "entrenador", session: Sesion = sesion) {
  workspaceMocks.useWorkspaceContext.mockReturnValue({
    activeSede: { id: "sede-1", nombre: "Sede Norte" },
    activeWorkspaceId: "workspace-1",
    rol,
  });
  sesionMocks.useSesiones.mockReturnValue({
    data: [session],
    loading: false,
    errorMessage: null,
    createOne: vi.fn(),
    updateOne: vi.fn(),
    deleteOne: vi.fn(),
    createLoading: false,
    updateLoading: false,
    createErrorMessage: null,
    updateErrorMessage: null,
  });
  lookupMocks.useEquiposLookup.mockReturnValue({ data: [{ id: "equipo-1", nombre: "Juvenil A" }] });
  lookupMocks.useEntrenadoresLookupByWorkspace.mockReturnValue({ data: [] });

  return render(<SesionesListView />);
}

describe("SesionesListView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("muestra Ejecutar como acción hermana de la tarjeta móvil para un rol autorizado", () => {
    renderList();

    const mobileCards = document.querySelector<HTMLElement>(".md\\:hidden");
    if (!mobileCards) throw new Error("No se ha renderizado la región de tarjetas móviles");
    const mobileCard = within(mobileCards).getByRole("button", { name: /juvenil a/i });
    const executeLink = within(mobileCards).getByRole("link", { name: "Ejecutar" });

    expect(executeLink).toHaveAttribute(
      "href",
      "/sesiones/sesion-movil-1/ejecutar",
    );
    expect(mobileCard).not.toContainElement(executeLink);
  });

  it("no abre el editor al hacer click en Ejecutar desde la tarjeta móvil", () => {
    renderList();

    const mobileCards = document.querySelector<HTMLElement>(".md\\:hidden");
    if (!mobileCards) throw new Error("No se ha renderizado la región de tarjetas móviles");
    fireEvent.click(within(mobileCards).getByRole("link", { name: "Ejecutar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no abre el editor al pulsar Enter en Ejecutar desde la tarjeta móvil", () => {
    renderList();

    const mobileCards = document.querySelector<HTMLElement>(".md\\:hidden");
    if (!mobileCards) throw new Error("No se ha renderizado la región de tarjetas móviles");
    fireEvent.keyDown(within(mobileCards).getByRole("link", { name: "Ejecutar" }), { key: "Enter" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("no muestra Ejecutar en la tarjeta móvil para un jugador", () => {
    renderList("jugador");

    const mobileCards = document.querySelector<HTMLElement>(".md\\:hidden");
    if (!mobileCards) throw new Error("No se ha renderizado la región de tarjetas móviles");

    expect(within(mobileCards).queryByRole("link", { name: "Ejecutar" })).not.toBeInTheDocument();
  });

  it("muestra Ejecutar para una sesión Borrador y un rol autorizado", () => {
    renderList("entrenador", { ...sesion, estado: "Borrador" });

    const mobileCards = document.querySelector<HTMLElement>(".md\\:hidden");
    if (!mobileCards) throw new Error("No se ha renderizado la región de tarjetas móviles");
    expect(within(mobileCards).getByRole("link", { name: "Ejecutar" })).toHaveAttribute(
      "href",
      "/sesiones/sesion-movil-1/ejecutar",
    );
  });
});
