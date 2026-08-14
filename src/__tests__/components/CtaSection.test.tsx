import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CtaSection } from "@/components/landing/CtaSection";

describe("CtaSection", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envía un correo válido a la ruta de lista de espera", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CtaSection />);

    const emailInput = screen.getByLabelText("Correo electrónico");
    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "email");
    expect(emailInput).toHaveAttribute("spellcheck", "false");

    fireEvent.change(emailInput, { target: { value: "club@ejemplo.es" } });
    fireEvent.click(screen.getByRole("button", { name: "Quiero entrar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/waitlist",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Te avisaremos");
  });

  it("conserva el correo y anuncia cómo recuperarse cuando el envío falla", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No se ha podido enviar. Inténtalo de nuevo." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<CtaSection />);
    const emailInput = screen.getByLabelText("Correo electrónico");

    fireEvent.change(emailInput, { target: { value: "club@ejemplo.es" } });
    fireEvent.click(screen.getByRole("button", { name: "Quiero entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Inténtalo de nuevo",
    );
    expect(emailInput).toHaveValue("club@ejemplo.es");
  });

  it("no envía un correo con formato inválido", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<CtaSection />);

    fireEvent.change(screen.getByLabelText("Correo electrónico"), {
      target: { value: "correo-invalido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Quiero entrar" }));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
