import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { BottomNav } from "@/components/shared/BottomNav"

const push = vi.fn()
const replace = vi.fn()
let pathname = "/sesiones"
let rol = "entrenador"

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ replace }),
}))

vi.mock("@/components/shared/AppLink", () => ({
  useAppNavigation: () => ({ push }),
}))

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({ rol }),
}))

vi.mock("@/components/shared/UserMenu", () => ({
  UserMenu: () => <button type="button">Menú de usuario</button>,
}))

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
}))

describe("navegación del shell", () => {
  it("muestra solo las rutas autorizadas y marca la ruta activa", () => {
    render(<AppSidebar />)

    expect(screen.getByRole("button", { name: "Sesiones" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sedes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Entrenadores" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Menú de usuario" })).toBeInTheDocument()
  })

  it("abre Más en móvil y navega solo por acciones autorizadas", () => {
    render(<BottomNav />)

    const mobileNavigation = screen.getByRole("navigation")

    expect(within(mobileNavigation).getByRole("button", { name: "Sesiones" })).toHaveAttribute("aria-current", "page")
    fireEvent.click(within(mobileNavigation).getByRole("button", { name: "Más" }))

    expect(screen.getByRole("button", { name: "Ejercicios" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sedes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Economía" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Ejercicios" }))
    expect(push).toHaveBeenCalledWith("/ejercicios")
  })

  it("muestra Economía solo a los roles autorizados y marca la ruta activa", () => {
    pathname = "/economia"
    rol = "admin"

    render(<AppSidebar />)
    expect(screen.getByRole("button", { name: "Economía" })).toHaveAttribute("aria-current", "page")

    render(<BottomNav />)
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Más" }))
    const economiaButtons = screen.getAllByRole("button", { name: "Economía" })
    expect(economiaButtons).toHaveLength(2)
    economiaButtons.forEach((button) => {
      expect(button).toHaveAttribute("aria-current", "page")
    })
  })
})
