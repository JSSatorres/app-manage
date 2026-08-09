import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/documentos",
  searchParams: new URLSearchParams("sede=sede-1"),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ replace: navigationMocks.replace }),
  useSearchParams: () => navigationMocks.searchParams,
}))

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }))

import { DocumentosProviderTabs } from "@/components/documentos/DocumentosProviderTabs"

const providers = {
  youtube: { state: "data" as const, count: 2, children: <p>Vídeos del club</p> },
  google_drive: { state: "loading" as const, count: 1 },
  supabase_storage: { state: "error" as const, errorMessage: "No se pudieron cargar los archivos." },
}

describe("DocumentosProviderTabs", () => {
  it("renderiza las tres pestañas con sus contadores y permite seleccionarlas con teclado", async () => {
    render(<DocumentosProviderTabs providers={providers} canWrite={false} />)

    const youtubeTab = screen.getByRole("tab", { name: "YouTube, 2 elementos" })
    const driveTab = screen.getByRole("tab", { name: "Google Drive, 1 elemento" })
    const storageTab = screen.getByRole("tab", { name: "Almacenamiento, 0 elementos" })

    expect(youtubeTab).toHaveAttribute("aria-selected", "true")
    expect(driveTab).toBeInTheDocument()
    expect(storageTab).toBeInTheDocument()

    await act(async () => {
      youtubeTab.focus()
      fireEvent.keyDown(youtubeTab, { key: "ArrowRight" })
      fireEvent.keyDown(driveTab, { key: "Enter" })
    })

    await waitFor(() => expect(driveTab).toHaveAttribute("aria-selected", "true"))
    expect(screen.getByLabelText("Cargando contenido de Google Drive")).toBeInTheDocument()
  })

  it("preserva la pestaña opcionalmente en la URL sin perder los parámetros existentes", () => {
    render(
      <DocumentosProviderTabs
        providers={providers}
        canWrite
        queryParam="fuente"
      />,
    )

    fireEvent.click(screen.getByRole("tab", { name: "Google Drive, 1 elemento" }))

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/documentos?sede=sede-1&fuente=google_drive",
      { scroll: false },
    )
  })

  it("muestra el error con reintento y conserva la guía como ayuda secundaria cuando hay datos", () => {
    const onRetry = vi.fn()
    const onCreate = vi.fn()
    const states = {
      ...providers,
      supabase_storage: {
        state: "error" as const,
        errorMessage: "No se pudieron cargar los archivos.",
        onRetry,
      },
    }

    render(
      <DocumentosProviderTabs
        providers={states}
        canWrite
        onCreate={onCreate}
      />,
    )

    expect(screen.getByText("Vídeos del club")).toBeInTheDocument()
    expect(screen.getByText("Cómo funciona")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Almacenamiento, 0 elementos" }))
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los archivos.")
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
