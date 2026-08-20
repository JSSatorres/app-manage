import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: auth.useAuth }));

const { pendingMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

import { StripeConnectionCard } from "@/components/economia/StripeConnectionCard";

describe("StripeConnectionCard", () => {
  beforeEach(() => {
    auth.useAuth.mockReturnValue({ loading: false, session: { access_token: "token" } });
    vi.stubGlobal("fetch", vi.fn());
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
  });

  it("explica el destino de los cobros y permite iniciar onboarding sin cuenta", () => {
    render(<StripeConnectionCard workspaceId="workspace-1" />);

    expect(screen.getByText("Los cobros llegan a la cuenta Stripe del club")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar onboarding" })).toBeInTheDocument();
  });

  it.each([
    ["pending", "Continuar onboarding"],
    ["restricted", "Actualizar datos"],
    ["active", "Actualizar datos"],
  ] as const)("muestra %s con su CTA", (status, actionLabel) => {
    render(<StripeConnectionCard workspaceId="workspace-1" initialConnection={{
      id: "connection-1",
      stripeAccountId: "acct_workspace",
      status,
      detailsSubmitted: status === "active",
      chargesEnabled: status === "active",
      payoutsEnabled: status === "active",
    }} />);

    expect(screen.getByRole("button", { name: actionLabel })).toBeInTheDocument();
  });

  it("solicita un enlace de onboarding autenticado", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ url: "https://connect.stripe.test/onboarding" }), { status: 200 }));
    const assign = vi.fn();

    render(<StripeConnectionCard workspaceId="workspace-1" initialConnection={{
      id: "connection-1", stripeAccountId: "acct_workspace", status: "pending", detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false,
    }} onNavigate={assign} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Continuar onboarding" }));
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/stripe/connect/account-link",
        expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer token" }) }),
      );
      expect(assign).toHaveBeenCalledWith("https://connect.stripe.test/onboarding");
    });
    expect(runMock).toHaveBeenCalledOnce();
  });

  it("crea la cuenta y el enlace en un Ãºnico flujo bloqueado", async () => {
    let resolveAccount: (response: Response) => void;
    let resolveLink: (response: Response) => void;
    const accountPromise = new Promise<Response>((resolve) => {
      resolveAccount = resolve;
    });
    const linkPromise = new Promise<Response>((resolve) => {
      resolveLink = resolve;
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ connection: null }), { status: 200 }))
      .mockReturnValueOnce(accountPromise)
      .mockReturnValueOnce(linkPromise);
    const onNavigate = vi.fn();

    render(<StripeConnectionCard workspaceId="workspace-1" onNavigate={onNavigate} />);
    const button = screen.getByRole("button", { name: "Iniciar onboarding" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/stripe/connect/account")).toHaveLength(1);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/stripe/connect/account", expect.objectContaining({ method: "POST" }));
    expect(runMock).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();

    resolveAccount!(new Response(JSON.stringify({ connection: {
      id: "connection-1", stripeAccountId: "acct_workspace", status: "pending", detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false,
    } }), { status: 200 }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith("/api/stripe/connect/account-link", expect.objectContaining({ method: "POST" })));
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/stripe/connect/account-link")).toHaveLength(1);
    resolveLink!(new Response(JSON.stringify({ url: "https://connect.stripe.test/onboarding" }), { status: 200 }));
    await vi.waitFor(() => expect(onNavigate).toHaveBeenCalledWith("https://connect.stripe.test/onboarding"));
  });

  it("conserva el error HTTP y corta el flujo antes de crear el enlace", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ connection: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "rejected" }), { status: 500 }));

    render(<StripeConnectionCard workspaceId="workspace-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Iniciar onboarding" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se ha podido conectar Stripe/i);
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/stripe/connect/account")).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/stripe/connect/account-link")).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/connect/account", expect.objectContaining({ method: "POST" }));
  });

  it("deshabilita el CTA mientras el lock global estÃ¡ pendiente", () => {
    pendingMock.value = true;
    render(<StripeConnectionCard workspaceId="workspace-1" initialConnection={{
      id: "connection-1", stripeAccountId: "acct_workspace", status: "pending", detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false,
    }} />);

    expect(screen.getByRole("button", { name: "Continuar onboarding" })).toBeDisabled();
  });
});
