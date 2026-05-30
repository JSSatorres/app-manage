"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useAppNavigation } from "./AppLink";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/services/supabase";
import { cn } from "@/lib/utils";

const primaryNavItems = [
  { title: "Inicio",    href: "/dashboard",  icon: LayoutDashboard },
  { title: "Equipos",   href: "/equipos",    icon: Shield },
  { title: "Sesiones",  href: "/sesiones",   icon: CalendarDays },
  { title: "Sedes",     href: "/sedes",      icon: Building2 },
];

const sheetSections = [
  {
    label: "Principal",
    items: [
      { title: "Sedes",        href: "/sedes",         icon: Building2,     color: "#3358ff" },
      { title: "Equipos",       href: "/equipos",        icon: Shield,        color: "#10b981" },
      { title: "Entrenadores",  href: "/entrenadores",   icon: ClipboardList,  color: "#f59e0b" },
      { title: "Jugadores",     href: "/jugadores",      icon: UserCircle,     color: "#ef4444" },
      { title: "Ejercicios",    href: "/ejercicios",     icon: Dumbbell,      color: "#8b5cf6" },
      { title: "Sesiones",      href: "/sesiones",       icon: CalendarDays,  color: "#0ea5e9" },
      { title: "Documentos",    href: "/documentos",     icon: FileText,      color: "#64748b" },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Usuarios",      href: "/usuarios",       icon: Users,         color: "#8b5cf6" },
      { title: "Configuración", href: "/configuracion",  icon: Settings2,     color: "#64748b" },
    ],
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { push } = useAppNavigation();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  const anyMoreActive = sheetSections
    .flatMap((s) => s.items)
    .some((item) => item.href !== "#" && isActive(item.href));

  function navigate(href: string) {
    setOpen(false);
    if (href !== "#") push(href);
  }

  async function handleSignOut() {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

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
        className={cn(
          "fixed left-0 right-0 z-[60] rounded-t-3xl border-t border-border transition-transform duration-[280ms]",
          "overflow-y-auto",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          bottom: 0,
          background: "var(--card)",
          maxHeight: "88vh",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
      >
        {/* Grab handle */}
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-border" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-[10px] pt-[10px]">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em]">Menú</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid size-[34px] place-items-center rounded-[9px] bg-secondary text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sections */}
        <div className="px-4 space-y-[18px]">
          {sheetSections.map((sec) => (
            <div key={sec.label}>
              <p className="mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                {sec.label}
              </p>
              <div className="overflow-hidden rounded-[15px] border border-border bg-card">
                {sec.items.map((item, idx) => {
                  const Icon = item.icon;
                  const active = item.href !== "#" && isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "flex w-full items-center gap-[13px] border-b border-border px-[14px] py-3 text-left transition-colors active:bg-secondary",
                        idx === sec.items.length - 1 && "border-b-0",
                        active && "bg-secondary/60"
                      )}
                    >
                      <span
                        className="grid size-[38px] shrink-0 place-items-center rounded-[11px]"
                        style={{
                          background: `color-mix(in srgb, ${item.color} 13%, var(--card))`,
                          color: `color-mix(in srgb, ${item.color} 62%, var(--foreground))`,
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

          {/* Cerrar sesión */}
          <div className="overflow-hidden rounded-[15px] border border-border bg-card">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-[13px] px-[14px] py-3 text-left transition-colors active:bg-secondary"
            >
              <span
                className="grid size-[38px] shrink-0 place-items-center rounded-[11px]"
                style={{ background: "color-mix(in srgb, #ef4444 13%, var(--card))", color: "color-mix(in srgb, #ef4444 62%, var(--foreground))" }}
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
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
        style={{
          background: "color-mix(in srgb, var(--background) 88%, transparent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around px-2 py-[7px]">
          {primaryNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => push(item.href)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-[10px] px-2 py-[5px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
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
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-[10px] px-2 py-[5px] transition-colors",
              (open || anyMoreActive) ? "text-primary" : "text-muted-foreground"
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
