import { readFile } from "node:fs/promises"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import nextConfig from "../../../next.config"
import { DocumentoPreviewDialog } from "@/components/documentos/DocumentoPreviewDialog"
import type { ContentAsset } from "@/types/content-assets"

type NextConfigWithHeaders = {
  headers?: () => Promise<Array<{
    source: string
    headers: Array<{ key: string; value: string }>
  }>>
}

const youtubeAsset: ContentAsset = {
  id: "asset-youtube",
  workspaceId: "workspace-1",
  provider: "youtube",
  status: "ready",
  originalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  externalResourceId: "dQw4w9WgXcQ",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  createdBy: "user-1",
  createdAt: "2026-08-09T10:00:00.000Z",
  updatedAt: "2026-08-09T10:00:00.000Z",
}

describe("seguridad de previsualizaciones de documentos", () => {
  it("limita frame-src al origen exacto necesario para el iframe de YouTube", async () => {
    const config = nextConfig as NextConfigWithHeaders

    expect(config.headers).toBeTypeOf("function")

    const rules = await config.headers!()
    const csp = rules
      .find((rule) => rule.source === "/:path*")
      ?.headers.find((header) => header.key === "Content-Security-Policy")?.value

    const frameSrc = csp?.split(";").find((directive) => directive.trimStart().startsWith("frame-src"))

    expect(frameSrc?.trim()).toBe("frame-src https://www.youtube-nocookie.com")
  })

  it("no renderiza un iframe cuando el embed de YouTube fue manipulado", () => {
    render(
      <DocumentoPreviewDialog
        asset={{ ...youtubeAsset, embedUrl: "https://attacker.example/embed/dQw4w9WgXcQ" }}
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(document.querySelector("iframe")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Abrir en YouTube" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    )
  })

  it("aÃ­sla el iframe y mantiene el origen de los secretos fuera del grafo cliente", async () => {
    const clientModule = await readFile("src/components/documentos/DocumentoPreviewDialog.tsx", "utf8")
    const storageService = await readFile("src/services/document-storage.service.ts", "utf8")
    const supabaseService = await readFile("src/services/supabase.ts", "utf8")
    const clientEnv = await readFile("src/lib/env.ts", "utf8")

    render(<DocumentoPreviewDialog asset={youtubeAsset} open onOpenChange={vi.fn()} />)

    const iframe = document.querySelector("iframe")
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-presentation")
    expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin")

    expect(`${clientModule}\n${storageService}\n${supabaseService}\n${clientEnv}`).not.toMatch(
      /SUPABASE_SERVICE_ROLE|service[_-]?role/i,
    )
    expect(clientModule).not.toContain("dangerouslySetInnerHTML")
  })
})
