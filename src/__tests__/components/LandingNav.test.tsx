import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LandingNav } from "@/components/landing/LandingNav";

describe("LandingNav", () => {
  it("expone y controla el estado del menú móvil", async () => {
    render(<LandingNav />);
    const menuButton = screen.getByRole("button", { name: "Abrir menú" });

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menuButton);

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Navegación móvil",
    });
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(menuButton).toHaveAttribute("aria-controls", mobileNavigation.id);
    await waitFor(() =>
      expect(
        within(mobileNavigation).getByRole("link", { name: "El producto" }),
      ).toHaveFocus(),
    );
  });

  it("cierra con Escape y devuelve el foco al botón", async () => {
    render(<LandingNav />);
    const menuButton = screen.getByRole("button", { name: "Abrir menú" });

    fireEvent.click(menuButton);
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(menuButton).toHaveFocus());
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("navigation", { name: "Navegación móvil" }),
    ).not.toBeInTheDocument();
  });
});
