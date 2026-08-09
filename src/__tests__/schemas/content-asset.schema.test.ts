import { describe, expect, it } from "vitest";
import {
  contentAssetSchema,
  createContentAssetLinkSchema,
  legacyContentAssetLinkSchema,
} from "@/schemas/content-asset.schema";

describe("createContentAssetLinkSchema", () => {
  it("acepta enlaces HTTPS de YouTube para nuevas altas", () => {
    expect(
      createContentAssetLinkSchema.safeParse({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }).success,
    ).toBe(true);
  });

  it("acepta enlaces HTTPS de Google Drive para nuevas altas", () => {
    expect(
      createContentAssetLinkSchema.safeParse({
        url: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view",
      }).success,
    ).toBe(true);
  });

  it("rechaza HTTP, hosts engañosos, iframe y enlaces genéricos en nuevas altas", () => {
    for (const url of [
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
      '<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ">',
      "https://recursos.club.example/manual",
      "https://drive.google.com/",
      "https://drive.google.com/open?foo=bar",
    ]) {
      expect(createContentAssetLinkSchema.safeParse({ url }).success).toBe(false);
    }
  });

  it("acepta enlaces genéricos solo como legado", () => {
    expect(
      legacyContentAssetLinkSchema.safeParse({ url: "https://recursos.club.example/manual" }).success,
    ).toBe(true);
  });

  it("valida las variantes del activo por proveedor", () => {
    expect(
      contentAssetSchema.safeParse({
        id: "60789cb3-a398-4501-a76f-9deb167ec7a3",
        workspaceId: "5edac1a0-fb80-4e80-a206-1ffc7d89ab9e",
        provider: "youtube",
        status: "ready",
        originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        externalResourceId: "dQw4w9WgXcQ",
        embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
        createdBy: "bd3d2956-59b0-4a34-9678-43d132a1d22f",
        createdAt: "2026-08-08T12:00:00.000Z",
        updatedAt: "2026-08-08T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
