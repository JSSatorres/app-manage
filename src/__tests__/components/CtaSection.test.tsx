import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CtaSection } from "@/components/landing/CtaSection";

describe("CtaSection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envía un correo válido a la ruta de lista de espera", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CtaSection />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "club@ejemplo.es" } });
    fireEvent.click(screen.getByRole("button", { name: "Quiero entrar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/waitlist", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByRole("status")).toHaveTextContent("Te avisaremos");
  });
});
