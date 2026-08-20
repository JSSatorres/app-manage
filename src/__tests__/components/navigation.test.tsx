import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppLink, useAppNavigation } from "@/components/shared/AppLink"
import { AppSidebar } from "@/components/shared/AppSidebar"
import { BottomNav } from "@/components/shared/BottomNav"
import { UserMenu } from "@/components/shared/UserMenu"

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}))
const requestLockMocks = vi.hoisted(() => ({
  pending: false,
  run: vi.fn(<T,>(operation: () => Promise<T>) => operation()),
}))
const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(() => Promise.resolve({ error: null })),
}))
let pathname = "/sesiones"
let rol = "entrenador"

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => routerMocks,
}))

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: requestLockMocks.pending, run: requestLockMocks.run }),
}))

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => ({ rol }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}))

vi.mock("@/services/supabase", () => ({
  getSupabaseClient: () => ({ auth: { signOut: authMocks.signOut } }),
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

function NavigationControls() {
  const { back, push, replace } = useAppNavigation()

  return (
    <>
      <button type="button" onClick={() => push("/destino")}>Navegar</button>
      <button type="button" onClick={() => replace("/reemplazo")}>Reemplazar</button>
      <button type="button" onClick={back}>Volver</button>
    </>
  )
}

function Deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

beforeEach(() => {
  pathname = "/sesiones"
  rol = "entrenador"
  requestLockMocks.pending = false
  requestLockMocks.run.mockReset()
  requestLockMocks.run.mockImplementation(<T,>(operation: () => Promise<T>) => operation())
  authMocks.signOut.mockReset()
  authMocks.signOut.mockResolvedValue({ error: null })
  routerMocks.back.mockReset()
  routerMocks.push.mockReset()
  routerMocks.replace.mockReset()
})

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
    expect(routerMocks.push).toHaveBeenCalledWith("/ejercicios")
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

  it("bloquea AppLink y toda la navegación imperativa mientras hay una solicitud pendiente", () => {
    requestLockMocks.pending = true
    render(
      <>
        <AppLink href="/enlace">Enlace</AppLink>
        <NavigationControls />
      </>,
    )

    const buttons = [
      screen.getByRole("button", { name: "Enlace" }),
      screen.getByRole("button", { name: "Navegar" }),
      screen.getByRole("button", { name: "Reemplazar" }),
      screen.getByRole("button", { name: "Volver" }),
    ]

    expect(buttons[0]).toBeDisabled()
    expect(buttons[0]).toHaveAttribute("aria-disabled", "true")

    buttons.forEach((button) => {
      fireEvent.click(button)
      fireEvent.keyDown(button, { key: "Enter" })
    })

    expect(routerMocks.push).not.toHaveBeenCalled()
    expect(routerMocks.replace).not.toHaveBeenCalled()
    expect(routerMocks.back).not.toHaveBeenCalled()
  })

  it("inhabilita la barra lateral y la navegación móvil durante una solicitud pendiente", () => {
    requestLockMocks.pending = true
    render(
      <>
        <AppSidebar />
        <BottomNav />
      </>,
    )

    const sidebarSession = screen.getAllByRole("button", { name: "Sesiones" })[0]
    const mobileNavigation = screen.getByRole("navigation")
    const mobileSession = within(mobileNavigation).getByRole("button", { name: "Sesiones" })
    const moreButton = within(mobileNavigation).getByRole("button", { name: "Más" })

    ;[sidebarSession, mobileSession, moreButton].forEach((button) => {
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute("aria-disabled", "true")
      fireEvent.click(button)
      fireEvent.keyDown(button, { key: "Enter" })
    })

    expect(screen.queryByRole("dialog", { name: "Menú" })).not.toBeInTheDocument()
    expect(routerMocks.push).not.toHaveBeenCalled()
  })

  it.each([
    ["menú de usuario", UserMenu],
    ["navegación móvil", BottomNav],
  ] as const)("no inicia dos cierres de sesión desde %s", async (_source, Component) => {
    const signOut = Deferred<{ error: null }>()
    authMocks.signOut.mockReturnValue(signOut.promise)
    render(<Component />)

    if (Component === BottomNav) {
      fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Más" }))
    } else {
      fireEvent.click(screen.getByRole("button", { name: "Menú de usuario" }))
    }

    const signOutButton = Component === BottomNav
      ? screen.getByRole("button", { name: "Cerrar sesión" })
      : screen.getByRole("menuitem", { name: "Cerrar sesión" })
    fireEvent.click(signOutButton)
    fireEvent.click(signOutButton)

    expect(requestLockMocks.run).toHaveBeenCalledTimes(1)
    expect(authMocks.signOut).toHaveBeenCalledTimes(1)

    signOut.resolve({ error: null })
    await signOut.promise
  })
})
