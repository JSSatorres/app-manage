import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: auth.useAuth }));

import { StripeConnectionCard } from "@/components/economia/StripeConnectionCard";

describe("StripeConnectionCard", () => {
  beforeEach(() => {
    auth.useAuth.mockReturnValue({ loading: false, session: { access_token: "token" } });
    vi.stubGlobal("fetch", vi.fn());
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
  });
});
