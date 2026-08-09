import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manage Sport App",
    short_name: "SportApp",
    description: "Aplicación de gestión deportiva",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f0e8",
    theme_color: "#1b1b19",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
