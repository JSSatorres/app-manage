import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EconomicEntry } from "@/types/economia";

const hookMocks = vi.hoisted(() => ({
  useEconomia: vi.fn(),
  useJugadores: vi.fn(),
  registrarMovimiento: vi.fn(),
}));
const workspaceMocks = vi.hoisted(() => ({ useWorkspaceContext: vi.fn() }));
const authMocks = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useEconomia", () => ({ useEconomia: hookMocks.useEconomia }));
vi.mock("@/hooks/useJugadores", () => ({ useJugadores: hookMocks.useJugadores }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: authMocks.useAuth }));
vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: workspaceMocks.useWorkspaceContext,
}));

import EconomiaPage from "@/app/(dashboard)/economia/page";

const entry: EconomicEntry = {
  id: "entry-1",
  workspaceId: "workspace-1",
  entryType: "player_charge",
  categoryId: "cuotas",
  playerId: "player-1",
  concept: "Cuota de septiembre",
  counterpartyName: null,
  amountMinor: 10000,
  currencyCode: "EUR",
  issueDate: "2026-09-01",
  dueDate: "2026-09-15",
  scheduleId: null,
  periodKey: null,
  lifecycle: "open",
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
};

function createEconomiaState(overrides: Record<string, unknown> = {}) {
  return {
    entradas: [],
    movimientos: [],
    categorias: [],
    cargandoResumen: false,
    errorResumen: null,
    creandoEntrada: false,
    actualizandoEntrada: false,
    errorCrearEntrada: null,
    errorActualizarEntrada: null,
    refetchEconomia: vi.fn(),
    crearEntrada: vi.fn(),
    actualizarEntrada: vi.fn(),
    cancelarEntrada: vi.fn(),
    registrarMovimiento: hookMocks.registrarMovimiento,
    registrandoMovimiento: false,
    errorRegistrarMovimiento: null,
    ...overrides,
  };
}

describe("EconomiaPage route", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/economia");
    workspaceMocks.useWorkspaceContext.mockReturnValue({ rol: "admin", activeWorkspaceId: "workspace-1" });
    hookMocks.useEconomia.mockReset();
    hookMocks.useJugadores.mockReset();
    hookMocks.useJugadores.mockReturnValue({ data: [] });
    hookMocks.registrarMovimiento.mockReset();
    hookMocks.useEconomia.mockReturnValue(createEconomiaState());
    authMocks.useAuth.mockReturnValue({ loading: false, session: { access_token: "token" } });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      connection: {
        id: "connection-1",
        stripeAccountId: "acct_club",
        status: "active",
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
      },
    }), { status: 200 }))));
  });

  it("permite el shell económico a admin en el workspace activo", () => {
    render(<EconomiaPage />);

    expect(screen.getByRole("heading", { name: "Gestión económica" })).toBeInTheDocument();
    expect(hookMocks.useEconomia).toHaveBeenCalledWith("workspace-1");
  });

  it("deniega el shell a un rol fuera de la matriz confirmada", () => {
    workspaceMocks.useWorkspaceContext.mockReturnValue({ rol: "gerente_sede", activeWorkspaceId: "workspace-1" });

    render(<EconomiaPage />);

    expect(screen.getByRole("heading", { name: "No tienes acceso" })).toBeInTheDocument();
    expect(hookMocks.useEconomia).not.toHaveBeenCalled();
  });

  it("registra un cobro con la entrada activa mediante la mutación del workspace", async () => {
    hookMocks.registrarMovimiento.mockResolvedValue({ id: "movement-1" });
    hookMocks.useEconomia.mockReturnValue(createEconomiaState({ entradas: [entry] }));

    render(<EconomiaPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Movimientos" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar cobro de Cuota de septiembre" })[0]);
    fireEvent.change(screen.getByLabelText(/^Importe/), { target: { value: "25,00" } });
    fireEvent.change(screen.getByLabelText(/^Fecha/), { target: { value: "2026-09-03" } });
    fireEvent.change(screen.getByLabelText(/^Referencia/), { target: { value: "TRF-001" } });
    fireEvent.click(screen.getByRole("button", { name: "Registrar cobro" }));

    await waitFor(() => expect(hookMocks.registrarMovimiento).toHaveBeenCalledWith({
      entryId: entry.id,
      movementType: "settlement",
      paymentMethod: "cash",
      amountMinor: 2500,
      currencyCode: "EUR",
      externalReference: "TRF-001",
      occurredAt: "2026-09-03",
    }));
    expect(hookMocks.useEconomia).toHaveBeenCalledWith("workspace-1");
  });

  it("muestra el estado y el error controlado al registrar un movimiento", () => {
    hookMocks.useEconomia.mockReturnValue(createEconomiaState({
      entradas: [entry],
      registrandoMovimiento: true,
      errorRegistrarMovimiento: "No se ha podido registrar el movimiento.",
    }));

    render(<EconomiaPage />);

    fireEvent.click(screen.getByRole("tab", { name: "Movimientos" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar cobro de Cuota de septiembre" })[0]);

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido registrar el movimiento.");
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();
  });

  it("compone el cobro Stripe activo y confirma el retorno sin mutar el saldo", async () => {
    window.history.replaceState(null, "", "/economia?checkout=processing");
    hookMocks.useEconomia.mockReturnValue(createEconomiaState({ entradas: [entry] }));

    render(<EconomiaPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Estamos confirmando el pago");
    fireEvent.click(screen.getByRole("tab", { name: "Movimientos" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Generar enlace de pago" })).not.toHaveLength(0));
    expect(hookMocks.registrarMovimiento).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      "/api/stripe/connect/status?workspaceId=workspace-1",
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });
});
