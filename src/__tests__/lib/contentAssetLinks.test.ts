import { describe, expect, it } from "vitest";
import { normalizeContentAssetLink } from "@/lib/contentAssetLinks";

describe("normalizeContentAssetLink", () => {
  it("normaliza una URL larga de YouTube y genera un embed sin cookies", () => {
    expect(
      normalizeContentAssetLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toEqual({
      provider: "youtube",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      externalResourceId: "dQw4w9WgXcQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("normaliza un enlace de archivo de Google Drive y conserva su identificador", () => {
    expect(
      normalizeContentAssetLink(
        "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing",
      ),
    ).toEqual({
      provider: "google_drive",
      canonicalUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view",
      externalResourceId: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
    });
  });

  it("normaliza enlaces cortos y shorts de YouTube", () => {
    expect(normalizeContentAssetLink("https://youtu.be/dQw4w9WgXcQ?feature=share")).toMatchObject({
      provider: "youtube",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(normalizeContentAssetLink("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toMatchObject({
      provider: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("extrae el identificador de enlaces open de Google Drive", () => {
    expect(normalizeContentAssetLink("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz")).toMatchObject({
      provider: "google_drive",
      fileId: "1AbCdEfGhIjKlMnOpQrStUvWxYz",
    });
  });

  it("rechaza enlaces de Google Drive que no identifican un recurso", () => {
    expect(normalizeContentAssetLink("https://drive.google.com/")).toBeNull();
    expect(normalizeContentAssetLink("https://drive.google.com/open?foo=bar")).toBeNull();
  });

  it("rechaza HTTP y contenido HTML o iframe", () => {
    expect(normalizeContentAssetLink("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(normalizeContentAssetLink('<iframe src="https://www.youtube.com/watch?v=dQw4w9WgXcQ">')).toBeNull();
  });

  it("no confunde hosts engañosos con YouTube y conserva enlaces heredados como legacy", () => {
    expect(normalizeContentAssetLink("https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "external_legacy",
      canonicalUrl: "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    });
    expect(normalizeContentAssetLink("https://recursos.club.example/manual")).toEqual({
      provider: "external_legacy",
      canonicalUrl: "https://recursos.club.example/manual",
    });
  });
});
