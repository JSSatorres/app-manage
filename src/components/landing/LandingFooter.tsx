import { Logo } from "./Logo";

const COLS: { title: string; links: string[] }[] = [
  { title: "Producto", links: ["Funciones", "Precios", "Roadmap", "Novedades"] },
  { title: "Recursos", links: ["Vídeos", "Guía de migración", "Centro de ayuda", "Estado del servicio"] },
  { title: "Empresa", links: ["Sobre nosotros", "Contacto", "Blog"] },
  { title: "Legal", links: ["Privacidad", "Términos", "Cookies"] },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_3fr]">
          <div>
            <Logo withKicker />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Gestión integral para clubes deportivos. El club entero, en una sola
              pantalla.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLS.map((c) => (
              <div key={c.title}>
                <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SportApp · Elite Management — Gestión integral
          para clubes deportivos.
        </div>
      </div>
    </footer>
  );
}
