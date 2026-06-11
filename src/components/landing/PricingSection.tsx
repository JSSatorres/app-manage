import { Check } from "lucide-react";
import { AppLink } from "@/components/shared/AppLink";
import { Reveal } from "./Reveal";

const PLANES = [
  {
    emoji: "🌱",
    name: "Club",
    para: "Para un club de una sede",
    precio: "Gratis",
    sub: "para empezar",
    feats: [
      "1 sede · equipos ilimitados",
      "Jugadores y entrenadores ilimitados",
      "Importación/exportación de Excel",
      "Documentos y enlaces",
    ],
    cta: "Empezar gratis",
    href: "/register",
    destacado: false,
  },
  {
    emoji: "🚀",
    name: "Multi-sede",
    para: "Para clubes con varios centros",
    precio: "[Precio]",
    sub: "/mes",
    feats: [
      "Sedes ilimitadas",
      "Roles avanzados (gerente de sede)",
      "Actividad en tiempo real",
      "Informes y filtros avanzados",
    ],
    cta: "Probar 14 días",
    href: "/register",
    destacado: true,
  },
  {
    emoji: "🏆",
    name: "Federación",
    para: "Para grupos y federaciones",
    precio: "A medida",
    sub: "",
    feats: [
      "Todo lo del plan Multi-sede",
      "Soporte dedicado + onboarding",
      "Personalización y SLA",
      "Integraciones a medida",
    ],
    cta: "Hablar con ventas",
    href: "/register",
    destacado: false,
  },
];

export function PricingSection() {
  return (
    <section id="precios" className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Precio simple. Sin sorpresas.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Empieza gratis. Crece cuando tu club crezca.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANES.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div
                className={`flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                  p.destacado
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : "border-border"
                }`}
              >
                {p.destacado && (
                  <span className="mb-3 inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    ★ Popular
                  </span>
                )}
                <div className="text-2xl">{p.emoji}</div>
                <h3 className="mt-2 text-xl font-bold text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.para}</p>
                <div className="mt-5 flex items-end gap-1.5">
                  <span className="text-3xl font-bold tracking-[-0.02em] text-foreground">
                    {p.precio}
                  </span>
                  {p.sub && (
                    <span className="pb-1 text-sm text-muted-foreground">{p.sub}</span>
                  )}
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.feats.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <AppLink
                  href={p.href}
                  className={`mt-7 inline-flex h-11 w-full items-center justify-center rounded-[11px] text-sm font-semibold transition-[filter,colors] ${
                    p.destacado
                      ? "bg-primary text-white hover:brightness-110"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {p.cta}
                </AppLink>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Sin tarjeta para empezar. Cancela cuando quieras. Tus datos salen en Excel
          cuando los quieras — sin candados.
        </p>
      </div>
    </section>
  );
}
