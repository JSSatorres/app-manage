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
  items: { title: string; href: string; icon: typeof Shield; tone: string; recurso: Recurso }[];
}[] = [
  {
    label: "Operativa",
    items: [
      { title: "Sesiones",      href: "/sesiones",       icon: CalendarDays,  tone: "bg-chart-2/12 text-chart-2", recurso: "sesiones" },
      { title: "Ejercicios",    href: "/ejercicios",     icon: Dumbbell,      tone: "bg-chart-6/12 text-chart-6", recurso: "ejercicios" },
      { title: "Documentos",    href: "/documentos",     icon: FileText,      tone: "bg-chart-7/12 text-chart-7", recurso: "documentos" },
    ],
  },
  {
    label: "Club",
    items: [
      { title: "Sedes",         href: "/sedes",          icon: Building2,     tone: "bg-chart-1/12 text-chart-1", recurso: "sedes" },
      { title: "Equipos",       href: "/equipos",        icon: Shield,        tone: "bg-chart-3/12 text-chart-3", recurso: "equipos" },
      { title: "Entrenadores",  href: "/entrenadores",   icon: ClipboardList, tone: "bg-chart-4/12 text-chart-4", recurso: "entrenadores" },
      { title: "Jugadores",     href: "/jugadores",      icon: UserCircle,    tone: "bg-chart-5/12 text-chart-5", recurso: "jugadores" },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Usuarios",      href: "/usuarios",       icon: Users,            tone: "bg-chart-6/12 text-chart-6", recurso: "usuarios" },
      { title: "Economía",      href: "/economia",       icon: CircleDollarSign, tone: "bg-chart-3/12 text-chart-3", recurso: "economia" },
      { title: "Configuración", href: "/configuracion",  icon: Settings2,        tone: "bg-secondary text-muted-foreground", recurso: "configuracion" },
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
          className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px]"
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
          "fixed left-0 right-0 z-[60] rounded-t-3xl border-t border-border bg-card shadow-float transition-[transform,visibility] duration-200",
          "overflow-y-auto",
          open ? "visible translate-y-0" : "invisible translate-y-full"
        )}
        style={{
          bottom: 0,
          maxHeight: "88vh",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Grab handle */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <h3 id={`${menuId}-title`} className="text-[17px] font-semibold tracking-[-0.01em]">Menú</h3>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            aria-disabled={pending}
            className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sections: mosaicos en cuadrícula para ver todo sin scroll */}
        <div className="space-y-4 px-4 py-3">
          {visibleSections.map((sec) => (
            <div key={sec.label}>
              <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {sec.label}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {sec.items.map((item) => {
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
                        "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:scale-[0.98]",
                        active ? "border-primary/40 bg-accent" : "border-border bg-card hover:bg-secondary"
                      )}
                    >
                      <span className={cn("grid size-9 place-items-center rounded-xl", item.tone)}>
                        <Icon size={18} />
                      </span>
                      <span className={cn("w-full truncate text-[12px] font-medium leading-tight", active && "font-semibold text-primary")}>
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Perfil + Cerrar sesión */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => navigate("/perfil")}
              disabled={pending}
              aria-disabled={pending}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 border-b border-border px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-secondary",
                isActive("/perfil") && "bg-accent"
              )}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                <UserRound size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn("block text-[14px] font-medium", isActive("/perfil") && "font-semibold text-primary")}>
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
              className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-secondary"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <LogOut size={17} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium text-destructive">
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-lg"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around px-1 pb-1 pt-1.5">
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
                  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-primary/12")}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
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
              "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
              (open || anyMoreActive) ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", (open || anyMoreActive) && "bg-primary/12")}>
              <MoreHorizontal size={20} strokeWidth={(open || anyMoreActive) ? 2.4 : 2} />
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
