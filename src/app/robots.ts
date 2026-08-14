import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

const PRIVATE_ROUTES = [
  "/api/",
  "/auth/",
  "/configuracion",
  "/dashboard",
  "/documentos",
  "/economia",
  "/ejercicios",
  "/equipos",
  "/join",
  "/login",
  "/offline",
  "/parametros",
  "/register",
  "/sedes",
  "/sesiones",
  "/usuarios",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/landing",
      disallow: PRIVATE_ROUTES,
    },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
    host: siteUrl.origin,
  };
}
