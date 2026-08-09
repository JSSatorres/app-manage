import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { access_token: "token" } }) }));

import { StripeCheckoutButton } from "@/components/economia/StripeCheckoutButton";

describe("StripeCheckoutButton", () => {
  it("crea un enlace solo para un cargo pendiente y una cuenta activa", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible />);
    fireEvent.click(screen.getByRole("button", { name: /generar enlace de pago/i }));

    await waitFor(() => expect(openMock).toHaveBeenCalledWith("https://checkout.stripe.test/session", "_blank", "noopener,noreferrer"));
    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/checkout", expect.objectContaining({ method: "POST" }));
  });

  it("no ofrece el CTA cuando el cargo no está pendiente o la cuenta no está activa", () => {
    const { rerender } = render(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible={false} />);
    expect(screen.queryByRole("button", { name: /generar enlace/i })).not.toBeInTheDocument();
    rerender(<StripeCheckoutButton workspaceId="workspace-1" entryId="entry-1" eligible={false} processing />);
    expect(screen.getByText("Estamos confirmando el pago")).toBeInTheDocument();
  });
});
