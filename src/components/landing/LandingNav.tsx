"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const links = [
  { href: "#funciones", label: "El producto" },
  { href: "#solucion", label: "Cómo ayuda" },
  { href: "#lista-espera", label: "Lista de espera" },
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
    <header className={cn("sticky top-0 z-50 w-full transition-colors", scrolled ? "border-b border-border bg-white/90 backdrop-blur-md" : "border-b border-transparent bg-white")}> 
      <nav className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#top" className="shrink-0" aria-label="SportApp inicio"><Logo /></a>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>)}
        </div>
        <a href="#lista-espera" className="hidden rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-110 md:inline-flex">Unirme a la lista</a>
        <button type="button" onClick={() => setOpen((value) => !value)} className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-muted md:hidden" aria-label="Menú">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </nav>
      {open && <div className="border-t border-border bg-white px-5 py-4 md:hidden"><div className="flex flex-col gap-1">{links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted">{link.label}</a>)}<a href="#lista-espera" onClick={() => setOpen(false)} className="mt-2 rounded-[10px] bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white">Unirme a la lista de espera</a></div></div>}
    </header>
  );
}
