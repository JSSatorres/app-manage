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
        className={cn(
          "flex w-full items-center gap-[11px] rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Logo / Brand */}
      <SidebarHeader className="px-[14px] pt-[22px] pb-[22px]">
        <div className="flex items-center gap-[11px] px-[10px]">
          <div className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Zap className="size-[17px] text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[16px] font-semibold leading-none tracking-[-0.02em] text-sidebar-accent-foreground">
              SportApp
            </p>
            <p className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">
              Elite Management
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav principal */}
      <SidebarContent className="px-[14px]">
        <p className="px-3 pb-[6px] pt-[14px] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
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
    </Sidebar>
  )
}
