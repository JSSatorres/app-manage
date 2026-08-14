import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandingPage, { metadata } from "@/app/landing/page";
import NotFound from "@/app/not-found";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/lib/siteUrl";

const siteUrl = getSiteUrl();

describe("infraestructura pública de la landing", () => {
  it("separa cabecera, contenido principal y pie en landmarks hermanos", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(<LandingPage />);

    expect(container.querySelector("main header")).not.toBeInTheDocument();
    expect(container.querySelector("main footer")).not.toBeInTheDocument();
    expect(
      container.querySelector('a[href="#contenido-principal"]'),
    ).toHaveTextContent("Saltar al contenido principal");
  });

  it("publica canonical y metadatos sociales absolutos", () => {
    expect(metadata.title).toEqual(
      expect.objectContaining({ absolute: expect.stringContaining("SportApp") }),
    );
    expect(metadata.alternates?.canonical).toEqual(
      new URL("/landing", siteUrl),
    );
    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        siteName: "SportApp",
        url: new URL("/landing", siteUrl),
        images: [
          expect.objectContaining({
            url: new URL("/landing/01-dashboard-redesign-2026.png", siteUrl),
          }),
        ],
      }),
    );
  });

  it("incluye solo la landing pública en el sitemap", () => {
    expect(sitemap()).toEqual([
      expect.objectContaining({
        url: new URL("/landing", siteUrl).href,
        changeFrequency: "monthly",
        priority: 1,
      }),
    ]);
  });

  it("permite rastrear la landing y excluye rutas privadas", () => {
    expect(robots()).toEqual(
      expect.objectContaining({
        rules: expect.objectContaining({
          allow: "/landing",
          disallow: expect.arrayContaining([
            "/api/",
            "/dashboard",
            "/login",
          ]),
        }),
        sitemap: new URL("/sitemap.xml", siteUrl).href,
      }),
    );
  });

  it("ofrece una salida útil desde una URL inexistente", () => {
    render(<NotFound />);

    expect(
      screen.getByRole("heading", { name: "Esta página no existe" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Volver a SportApp" })).toHaveAttribute(
      "href",
      "/landing",
    );
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
