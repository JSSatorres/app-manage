import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DocumentoUploadMethodDialog } from "@/components/documentos/DocumentoUploadMethodDialog"

describe("DocumentoUploadMethodDialog", () => {
  it("muestra exactamente los tres métodos de alta en un diálogo accesible", () => {
    render(
      <DocumentoUploadMethodDialog
        open
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("dialog", { name: "¿Cómo quieres subir el documento?" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Elige el origen del documento para continuar."),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "YouTube" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Google Drive" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Almacenamiento" })).toBeInTheDocument()
    expect(
      screen.getAllByRole("button", {
        name: /^(YouTube|Google Drive|Almacenamiento)$/,
      }),
    ).toHaveLength(3)
  })

  it("cierra sin seleccionar ningún método", () => {
    const onOpenChange = vi.fn()
    const onSelect = vi.fn()
    render(
      <DocumentoUploadMethodDialog
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }))

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
    expect(onSelect).not.toHaveBeenCalled()
  })

  it.each([
    ["YouTube", "youtube"],
    ["Google Drive", "google_drive"],
    ["Almacenamiento", "supabase_storage"],
  ] as const)("selecciona %s y cierra el diálogo", (label, provider) => {
    const onOpenChange = vi.fn()
    const onSelect = vi.fn()
    render(
      <DocumentoUploadMethodDialog
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: label }))

    expect(onSelect).toHaveBeenCalledWith(provider)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
