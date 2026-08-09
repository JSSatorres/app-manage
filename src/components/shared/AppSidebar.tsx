"use client"

import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Dumbbell,
  CalendarDays,
  FileText,
  Zap,
  ClipboardList,
  UserCircle,
  CircleDollarSign,
} from "lucide-react"
import { useAppNavigation } from "./AppLink"
import { UserMenu } from "./UserMenu"
import { cn } from "@/lib/utils"
import { useWorkspaceContext } from "@/lib/workspaceContext"
import { can, type Recurso } from "@/lib/permisos"

const navItems: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; recurso: Recurso }[] = [
  { title: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard, recurso: "dashboard" },
  { title: "Sedes",        href: "/sedes",         icon: Building2,        recurso: "sedes" },
  { title: "Equipos",      href: "/equipos",       icon: Shield,          recurso: "equipos" },
  { title: "Entrenadores", href: "/entrenadores",  icon: ClipboardList,   recurso: "entrenadores" },
  { title: "Jugadores",    href: "/jugadores",     icon: UserCircle,      recurso: "jugadores" },
  { title: "Usuarios",     href: "/usuarios",      icon: Users,           recurso: "usuarios" },
  { title: "Economía",     href: "/economia",      icon: CircleDollarSign, recurso: "economia" },
  { title: "Ejercicios",   href: "/ejercicios",    icon: Dumbbell,        recurso: "ejercicios" },
  { title: "Sesiones",     href: "/sesiones",      icon: CalendarDays,    recurso: "sesiones" },
  { title: "Documentos",   href: "/documentos",    icon: FileText,        recurso: "documentos" },
]



interface NavItemProps {
  item: {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
  }
  isActive: boolean
}

function NavItem({ item, isActive }: NavItemProps) {
  const { push } = useAppNavigation()
  const Icon = item.icon

  return (
    <SidebarMenuItem className="list-none">
      <button
        type="button"
        onClick={() => push(item.href)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-11 w-full items-center gap-[11px] border-b border-sidebar-border px-2 py-2 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring",
          isActive
            ? "bg-sidebar-accent text-primary font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon
          className={cn(
            "size-[18px] shrink-0 opacity-70",
            isActive && "opacity-100 text-sidebar-primary"
          )}
        />
        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
      </button>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { rol } = useWorkspaceContext()

  const visibleNavItems = navItems.filter((item) => can(rol, item.recurso, "view"))

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground [--sidebar-width:11.5rem] [--sidebar-width-icon:3.75rem] [&_[data-slot=sidebar-inner]]:bg-sidebar"
    >
      {/* Logo / Brand */}
      <SidebarHeader className="border-b border-sidebar-border px-4 pb-5 pt-[22px]">
        <div className="flex min-h-11 items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <Zap className="size-[18px]" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-heading text-[21px] leading-none tracking-[0.02em] text-sidebar-accent-foreground">
              SPORT<span className="text-primary">APP</span>
            </p>
            <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground">
              Elite Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav principal */}
      <SidebarContent className="px-4 py-4">
        <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          Principal
        </p>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-[2px]">
              {visibleNavItems.map((item) => (
                <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Usuario */}
      <SidebarFooter className="border-t border-sidebar-border px-3 py-3">
        <UserMenu variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  )
}
