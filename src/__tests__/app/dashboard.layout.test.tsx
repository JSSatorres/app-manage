import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const contextMocks = vi.hoisted(() => ({
  value: { ready: true, needsOnboarding: false, isJugador: false },
}))
const navigationMocks = vi.hoisted(() => ({ pathname: "/sesiones" }))

vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SidebarInset: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/components/auth/AuthGate", () => ({
  AuthGate: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/workspaceContext", () => ({
  WorkspaceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useWorkspaceContext: () => contextMocks.value,
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
}))

vi.mock("@/components/shared/AppSidebar", () => ({
  AppSidebar: () => <aside>Barra lateral</aside>,
}))

vi.mock("@/components/shared/TopBar", () => ({
  TopBar: () => <header>Cabecera de escritorio</header>,
}))

vi.mock("@/components/shared/SedeSwitcher", () => ({
  SedeSwitcher: () => <div>Selector de sede</div>,
}))

vi.mock("@/components/shared/BottomNav", () => ({
  BottomNav: () => <nav>Navegación móvil</nav>,
}))

vi.mock("@/components/onboarding/CreateClubForm", () => ({
  CreateClubForm: () => <div>Crear club</div>,
}))

vi.mock("@/components/shared/RequireRol", () => ({
  AccesoDenegado: ({ titulo, descripcion }: { titulo?: string; descripcion?: string }) => (
    <div>
      <p>{titulo}</p>
      <p>{descripcion}</p>
    </div>
  ),
}))

import DashboardLayout from "@/app/(dashboard)/layout"

describe("DashboardLayout", () => {
  it("deja montar el runner exacto para que jugador reciba su denegación específica", () => {
    contextMocks.value = { ready: true, needsOnboarding: false, isJugador: true }
    navigationMocks.pathname = "/sesiones/123e4567-e89b-12d3-a456-426614174000/ejecutar"

    render(
      <DashboardLayout>
        <p>No tienes permiso para ejecutar esta sesión.</p>
      </DashboardLayout>,
    )

    expect(screen.getByText("No tienes permiso para ejecutar esta sesión.")).toBeInTheDocument()
    expect(screen.queryByText("Acceso no disponible")).not.toBeInTheDocument()
  })

  it("mantiene denegado el resto del panel para jugador", () => {
    contextMocks.value = { ready: true, needsOnboarding: false, isJugador: true }
    navigationMocks.pathname = "/sesiones"

    render(
      <DashboardLayout>
        <p>Contenido de gestión</p>
      </DashboardLayout>,
    )

    expect(screen.getByText("Acceso no disponible")).toBeInTheDocument()
    expect(screen.queryByText("Contenido de gestión")).not.toBeInTheDocument()
  })

  it("oculta la cabecera móvil en escritorio para no duplicar el TopBar", () => {
    contextMocks.value = { ready: true, needsOnboarding: false, isJugador: false }
    navigationMocks.pathname = "/sesiones"
    const { container } = render(
      <DashboardLayout>
        <p>Contenido de la página</p>
      </DashboardLayout>,
    )

    const mobileHeader = Array.from(container.querySelectorAll("header")).find((header) =>
      header.textContent?.includes("SPORTAPP"),
    )

    expect(mobileHeader).toBeDefined()
    expect(mobileHeader).toHaveClass("md:hidden")
  })
})
