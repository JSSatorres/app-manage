import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/landing", getSiteUrl()).href,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
