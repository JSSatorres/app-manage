import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { DocumentoProviderEmptyState } from "@/components/documentos/DocumentoProviderEmptyState"

describe("DocumentoProviderEmptyState", () => {
  it("muestra la guía exacta y la CTA de YouTube a quien puede escribir", () => {
    const onCreate = vi.fn()

    render(
      <DocumentoProviderEmptyState
        provider="youtube"
        state="empty-setup"
        canWrite
        onCreate={onCreate}
      />,
    )

    expect(
      screen.getByText(
        "1. Crea o usa el canal del club. 2. Sube el vídeo y selecciona No listado solo si no contiene información sensible; comprueba que permite inserción. 3. Copia el enlace y pégalo aquí.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("No listado no significa privado.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Añadir vídeo de YouTube" }))
    expect(onCreate).toHaveBeenCalledOnce()
  })

  it("explica los permisos de Drive y oculta la CTA para un rol de solo lectura", () => {
    render(
      <DocumentoProviderEmptyState
        provider="google_drive"
        state="empty-setup"
        canWrite={false}
      />,
    )

    expect(
      screen.getByText(
        "1. Sube el archivo al Drive del club. 2. Comparte con las personas o grupo correctos; evita Publicar en la Web para contenido interno. 3. Copia el enlace de Drive y pégalo aquí.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Quien abra el enlace debe iniciar sesión con una cuenta que tenga permisos en Drive.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Aún no hay contenido disponible; contacta con un gestor."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /añadir enlace/i })).not.toBeInTheDocument()
  })

  it("distingue los filtros vacíos de una fuente sin configurar", () => {
    const onClearFilters = vi.fn()

    render(
      <DocumentoProviderEmptyState
        provider="supabase_storage"
        state="empty-filtered"
        canWrite={false}
        onClearFilters={onClearFilters}
      />,
    )

    expect(screen.getByText("No hay contenido con los filtros actuales.")).toBeInTheDocument()
    expect(screen.queryByText(/Revisa espacio disponible/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })

  it("muestra el tutorial de cuota privada de Supabase", () => {
    render(
      <DocumentoProviderEmptyState
        provider="supabase_storage"
        state="empty-setup"
        canWrite
      />,
    )

    expect(
      screen.getByText(
        "1. Revisa espacio disponible y formatos permitidos. 2. Elige archivo, visibilidad y relaciones. 3. Sube; el archivo quedará privado y contará en tu cuota.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Tamaño máximo de archivo: 100 MB.")).toBeInTheDocument()
  })
})
