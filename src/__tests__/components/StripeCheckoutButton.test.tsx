import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { access_token: "token" } }) }));

const { pendingMock, runMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

import { StripeCheckoutButton } from "@/components/economia/StripeCheckoutButton";

describe("StripeCheckoutButton", () => {
  beforeEach(() => {
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
  });

  it("crea un enlace solo para un cargo pendiente y una cuenta activa", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible />);
    fireEvent.click(screen.getByRole("button", { name: /generar enlace de pago/i }));

    await waitFor(() => expect(openMock).toHaveBeenCalledWith("https://checkout.stripe.test/session", "_blank", "noopener,noreferrer"));
    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout", expect.objectContaining({ method: "POST" }));
    expect(runMock).toHaveBeenCalledOnce();
  });

  it("bloquea intentos repetidos mientras genera el enlace", async () => {
    let resolveResponse: (response: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(responsePromise);
    vi.stubGlobal("fetch", fetchMock);
    const onNavigate = vi.fn();

    render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible onNavigate={onNavigate} />);
    const button = screen.getByRole("button", { name: /generar enlace de pago/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(runMock).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();

    resolveResponse!(new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith("https://checkout.stripe.test/session"));
  });

  it("conserva el error cuando Stripe rechaza la solicitud", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "rejected" }), { status: 500 })));

    render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible />);
    fireEvent.click(screen.getByRole("button", { name: /generar enlace de pago/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se ha podido generar el enlace de pago/i);
  });

  it("deshabilita el CTA mientras el lock global estÃ¡ pendiente", () => {
    pendingMock.value = true;
    render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible />);

    expect(screen.getByRole("button", { name: /generar enlace de pago/i })).toBeDisabled();
  });

  it("no ofrece el CTA cuando el cargo no está pendiente o la cuenta no está activa", () => {
    const { rerender } = render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible={false} />);
    expect(screen.queryByRole("button", { name: /generar enlace/i })).not.toBeInTheDocument();
    rerender(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible={false} processing />);
    expect(screen.getByText("Estamos confirmando el pago")).toBeInTheDocument();
  });
});
