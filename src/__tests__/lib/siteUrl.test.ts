import { describe, expect, it } from "vitest";
import { getSiteUrl } from "@/lib/siteUrl";

describe("getSiteUrl", () => {
  it("prioriza APP_URL y normaliza la URL a su origen", () => {
    expect(
      getSiteUrl({
        APP_URL: "https://sportapp.ejemplo.es/ruta/",
        VERCEL_PROJECT_PRODUCTION_URL: "sportapp.vercel.app",
      }),
    ).toEqual(new URL("https://sportapp.ejemplo.es"));
  });

  it("usa el dominio de producción de Vercel cuando APP_URL no está configurada", () => {
    expect(
      getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "sportapp.vercel.app" }),
    ).toEqual(new URL("https://sportapp.vercel.app"));
  });

  it("usa la URL del despliegue de Vercel como siguiente alternativa", () => {
    expect(getSiteUrl({ VERCEL_URL: "sportapp-git-main.vercel.app" })).toEqual(
      new URL("https://sportapp-git-main.vercel.app"),
    );
  });

  it("usa localhost únicamente fuera de un despliegue configurado", () => {
    expect(getSiteUrl({})).toEqual(new URL("http://localhost:3000"));
  });

  it("rechaza una APP_URL explícita que no sea http o https", () => {
    expect(() => getSiteUrl({ APP_URL: "ftp://sportapp.ejemplo.es" })).toThrow(
      "APP_URL debe usar http o https",
    );
  });
});
