import { AppLink } from "@/components/shared/AppLink";
import { Reveal } from "./Reveal";

export function CtaSection() {
  return (
    <section className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] px-6 py-16 text-center sm:px-10 sm:py-20"
            style={{
              background:
                "radial-gradient(ellipse 80% 120% at 50% 0%, rgba(255,255,255,0.14) 0%, transparent 60%), #3358ff",
            }}
          >
            <h2 className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-[-0.02em] text-white sm:text-[40px]">
              Tu club merece algo mejor que un Excel.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-white/80">
              Empieza gratis hoy. Trae tu hoja de cálculo y míralo conectarse solo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <AppLink
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-white px-7 text-[15px] font-semibold text-primary shadow-sm transition-colors hover:bg-white/90 sm:w-auto"
              >
                Probar gratis
              </AppLink>
              <a
                href="#videos"
                className="inline-flex h-12 w-full items-center justify-center rounded-[12px] border border-white/30 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
              >
                Ver una demo
              </a>
            </div>
            <p className="mt-6 text-sm text-white/70">
              Sin tarjeta · Importación de tu Excel incluida · Cancela cuando quieras
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
