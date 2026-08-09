import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/landing/Hero";

describe("Hero", () => {
  it("mantiene visible el contenido principal antes de que la animación termine", () => {
    render(<Hero />);

    expect(
      screen.getByRole("heading", {
        name: "El club entero, al d\u00eda y conectado.",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("SportApp \u00b7 un producto de Satorus.es"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /unirme a la lista de espera/i }),
    ).toBeVisible();
    expect(document.body.textContent).not.toMatch(/[\u00c2\u00c3\u00e2\u00f0]/);
  });

  it("usa una URL versionada para no servir la captura anterior desde caché", () => {
    render(<Hero />);

    expect(
      screen.getByRole("img", {
        name: "Dashboard semanal de SportApp con el estado de las sesiones",
      }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("01-dashboard-redesign-2026.png"),
    );
  });
});
