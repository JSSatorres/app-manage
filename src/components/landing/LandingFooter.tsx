import Image from "next/image";
import Link from "next/link";
import { Logo } from "./Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 font-sans text-white" style={{ backgroundColor: "#10192b" }}>
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-14 sm:px-6 sm:pt-16">
        <div className="grid md:grid-cols-3" style={{ columnGap: "3rem", rowGap: "3rem" }}>
          <div className="lg:col-span-2">
            <Logo invert />
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/75">
              Manage Sport App reúne equipos, sesiones, personas y documentos para que
              todo el club trabaje desde un mismo lugar.
            </p>
            <a
              href="https://satorus.es"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm transition-colors hover:bg-white/10"
            >
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-white/10"
                style={{ backgroundColor: "#1a2438" }}
              >
                <Image
                  src="/landing/satorus-mark-negative.svg"
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                />
              </span>
              <span>
                <span className="block text-xs text-blue-100/65">SportApp es un producto de</span>
                <span className="font-semibold text-white">Satorus.es ↗</span>
              </span>
            </a>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Enlaces rápidos</h2>
            <nav className="mt-5 flex flex-col items-start gap-3 text-sm text-blue-100/75" aria-label="Enlaces del pie de página">
              <a href="#top" className="transition-colors hover:text-white">Inicio</a>
              <Link href="/login" className="transition-colors hover:text-white">Iniciar sesión</Link>
              <a href="#lista-espera" className="transition-colors hover:text-white">Registrarse</a>
            </nav>
            <p className="mt-4 max-w-48 text-xs leading-5 text-blue-100/45">
              El acceso es solo para cuentas ya habilitadas. Las nuevas altas pasan por la lista de espera.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Información</h2>
            <div className="mt-5 flex flex-col items-start gap-3 text-sm text-blue-100/75">
              <a href="mailto:admin@satorus.es" className="transition-colors hover:text-white">Contacto</a>
              <a href="https://satorus.es" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Satorus.es</a>
              <span>Privacidad y protección de datos</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-blue-100/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Manage Sport App. Todos los derechos reservados.</span>
          <span>Cookies · Privacidad · Protección de datos</span>
        </div>
      </div>
    </footer>
  );
}
