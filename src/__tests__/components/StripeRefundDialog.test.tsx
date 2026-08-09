import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session: { access_token: "token" } }) }));

import { StripeRefundDialog } from "@/components/economia/StripeRefundDialog";

describe("StripeRefundDialog", () => {
  it("permite solicitar un reembolso parcial hasta el máximo del cargo y advierte que afecta al saldo Stripe del club", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ refundId: "re_123", status: "processing" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const onOpenChange = vi.fn();

    render(
      <StripeRefundDialog
        open
        onOpenChange={onOpenChange}
        workspaceId="workspace-1"
        settlementId="settlement-1"
        maxAmountMinor={5000}
        currencyCode="EUR"
      />,
    );

    expect(screen.getByText(/saldo de la cuenta Stripe del club/i)).toBeInTheDocument();
    const amountInput = screen.getByLabelText(/importe a reembolsar/i);
    expect(amountInput).toHaveAttribute("max", "5000");
    fireEvent.change(amountInput, { target: { value: "2000" } });
    fireEvent.click(screen.getByRole("button", { name: /solicitar reembolso/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/stripe/refunds", expect.objectContaining({ method: "POST" })));
    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/refunds", expect.objectContaining({
      body: JSON.stringify({ workspaceId: "workspace-1", settlementId: "settlement-1", amountMinor: 2000, reason: "requested_by_customer" }),
    }));
    expect(screen.getByRole("status")).toHaveTextContent(/solicitud.*procesamiento/i);
  });

  it("notifica que debe refrescarse la economía después de solicitar el reembolso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ refundId: "re_123", status: "requested" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const onRequested = vi.fn();

    render(
      <StripeRefundDialog
        open
        onOpenChange={vi.fn()}
        workspaceId="workspace-1"
        settlementId="settlement-1"
        maxAmountMinor={5000}
        currencyCode="EUR"
        onRequested={onRequested}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /solicitar reembolso/i }));

    await waitFor(() => expect(onRequested).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent(/solicitud.*registrad/i);
  });
});
