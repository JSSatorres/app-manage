"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AppLink } from "@/components/shared/AppLink";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#funciones", label: "Funciones" },
  { href: "#feature", label: "Tiempo real" },
  { href: "#videos", label: "Vídeos" },
  { href: "#precios", label: "Precios" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        scrolled
          ? "border-b border-border bg-white/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#top" className="shrink-0" aria-label="SportApp inicio">
          <Logo />
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <AppLink
            href="/login"
            className="rounded-[10px] px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Entrar
          </AppLink>
          <AppLink
            href="/register"
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-110"
          >
            Probar gratis
          </AppLink>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-muted md:hidden"
          aria-label="Menú"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-white px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <AppLink
                href="/login"
                className="w-full rounded-[10px] border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground"
              >
                Entrar
              </AppLink>
              <AppLink
                href="/register"
                className="w-full rounded-[10px] bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Probar gratis
              </AppLink>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
