"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Shield,
  ClipboardList,
  UserCircle,
  Users,
  Dumbbell,
  FileText,
  Settings2,
  LogOut,
  MoreHorizontal,
  X,
  ChevronRight,
  UserRound,
  CircleDollarSign,
} from "lucide-react";
import { useAppNavigation } from "./AppLink";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/services/supabase";
import { cn } from "@/lib/utils";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can, type Recurso } from "@/lib/permisos";
import { useRequestLock } from "@/providers/request-lock-provider";

const primaryNavItems: { title: string; href: string; icon: typeof Shield; recurso: Recurso }[] = [
  { title: "Inicio",    href: "/dashboard",  icon: LayoutDashboard, recurso: "dashboard" },
  { title: "Equipos",   href: "/equipos",    icon: Shield,          recurso: "equipos" },
  { title: "Sesiones",  href: "/sesiones",   icon: CalendarDays,    recurso: "sesiones" },
  { title: "Sedes",     href: "/sedes",      icon: Building2,        recurso: "sedes" },
];

const sheetSections: {
  label: string;
  items: { title: string; href: string; icon: typeof Shield; color: string; recurso: Recurso }[];
}[] = [
  {
    label: "Principal",
    items: [
      { title: "Sedes",        href: "/sedes",         icon: Building2,     color: "#3358ff", recurso: "sedes" },
      { title: "Equipos",       href: "/equipos",        icon: Shield,        color: "#10b981", recurso: "equipos" },
      { title: "Entrenadores",  href: "/entrenadores",   icon: ClipboardList,  color: "#f59e0b", recurso: "entrenadores" },
      { title: "Jugadores",     href: "/jugadores",      icon: UserCircle,     color: "#ef4444", recurso: "jugadores" },
      { title: "Ejercicios",    href: "/ejercicios",     icon: Dumbbell,      color: "#8b5cf6", recurso: "ejercicios" },
      { title: "Sesiones",      href: "/sesiones",       icon: CalendarDays,  color: "#0ea5e9", recurso: "sesiones" },
      { title: "Documentos",    href: "/documentos",     icon: FileText,      color: "#64748b", recurso: "documentos" },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Usuarios",      href: "/usuarios",       icon: Users,         color: "#8b5cf6", recurso: "usuarios" },
      { title: "Economía",      href: "/economia",       icon: CircleDollarSign, color: "#10b981", recurso: "economia" },
      { title: "Configuración", href: "/configuracion",  icon: Settings2,     color: "#64748b", recurso: "configuracion" },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { push } = useAppNavigation();
  const router = useRouter();
  const { pending, run } = useRequestLock();
  const { rol } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const signOutInFlightRef = useRef(false);

  const visiblePrimary = primaryNavItems.filter((item) => can(rol, item.recurso, "view"));
  const visibleSections = sheetSections
    .map((sec) => ({ ...sec, items: sec.items.filter((item) => can(rol, item.recurso, "view")) }))
    .filter((sec) => sec.items.length > 0);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  const anyMoreActive = visibleSections
    .flatMap((s) => s.items)
    .some((item) => item.href !== "#" && isActive(item.href));

  function navigate(href: string) {
    if (pending) return;
    setOpen(false);
    if (href !== "#") push(href);
  }

  async function handleSignOut() {
    if (pending || signOutInFlightRef.current) return;

    signOutInFlightRef.current = true;
    setSigningOut(true);

    try {
      await run(async () => {
        const supabase = getSupabaseClient();
        if (supabase) await supabase.auth.signOut();
        router.replace("/login");
      });
    } finally {
      signOutInFlightRef.current = false;
      setSigningOut(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [open]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60]"
          style={{ background: "rgba(10,12,18,.35)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${menuId}-title`}
        aria-hidden={!open}
        className={cn(
          "fixed left-0 right-0 z-[60] border-t-2 border-foreground bg-card transition-transform duration-200",
          "overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          bottom: 0,
          maxHeight: "88vh",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Grab handle */}
        <div className="mx-auto mt-3 h-1 w-9 bg-border" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 id={`${menuId}-title`} className="font-heading text-[22px] leading-none tracking-[0.01em]">Menú</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            aria-disabled={pending}
            className="grid size-11 place-items-center bg-secondary text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-5 px-4 py-5">
          {visibleSections.map((sec) => (
            <div key={sec.label}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {sec.label}
              </p>
              <div className="border-y border-foreground bg-card">
                {sec.items.map((item, idx) => {
                  const Icon = item.icon;
                  const active = item.href !== "#" && isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      disabled={pending}
                      aria-disabled={pending}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 border-b border-border px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-secondary",
                        idx === sec.items.length - 1 && "border-b-0",
                        active && "bg-secondary/60"
                      )}
                    >
                      <span
                        className="grid size-10 shrink-0 place-items-center bg-secondary text-foreground"
                        style={{
                          borderTop: `3px solid ${item.color === "#ef4444" ? "var(--destructive)" : "var(--primary)"}`,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={cn("block text-[15px] font-semibold tracking-[-0.01em]", active && "text-primary")}>
                          {item.title}
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Perfil + Cerrar sesión */}
          <div className="border-y border-foreground bg-card">
            <button
              type="button"
              onClick={() => navigate("/perfil")}
              disabled={pending}
              aria-disabled={pending}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 border-b border-border px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-secondary",
                isActive("/perfil") && "bg-secondary/60"
              )}
            >
              <span
                className="grid size-10 shrink-0 place-items-center border-t-[3px] border-primary bg-secondary text-foreground"
              >
                <UserRound size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn("block text-[15px] font-semibold tracking-[-0.01em]", isActive("/perfil") && "text-primary")}>
                  Perfil
                </span>
              </span>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={pending || signingOut}
              aria-disabled={pending || signingOut}
              className="flex min-h-12 w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-secondary"
            >
              <span
                className="grid size-10 shrink-0 place-items-center border-t-[3px] border-destructive bg-secondary text-destructive"
              >
                <LogOut size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold tracking-[-0.01em] text-destructive">
                  Cerrar sesión
                </span>
              </span>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-foreground bg-card"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around px-1 py-1">
          {visiblePrimary.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => push(item.href)}
                disabled={pending}
                aria-disabled={pending}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  active ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <span className="grid place-items-center">
                  <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={cn("text-[10.5px] font-medium leading-none", active && "font-semibold")}>
                  {item.title}
                </span>
              </button>
            );
          })}

          {/* Más */}
          <button
            type="button"
            onClick={() => {
              if (!pending) setOpen((v) => !v);
            }}
            disabled={pending}
            aria-disabled={pending}
            aria-controls={menuId}
            aria-expanded={open}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
              (open || anyMoreActive) ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="grid place-items-center">
              <MoreHorizontal size={21} strokeWidth={(open || anyMoreActive) ? 2.5 : 2} />
            </span>
            <span className={cn("text-[10.5px] font-medium leading-none", (open || anyMoreActive) && "font-semibold")}>
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
