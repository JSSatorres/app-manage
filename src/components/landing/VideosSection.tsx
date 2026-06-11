import Image from "next/image";
import { Play } from "lucide-react";
import { Reveal } from "./Reveal";

const FEATURED = {
  img: "/landing/09-sesion-nota-lluvia.png",
  title: "SportApp en 2 minutos",
  dur: "2:10",
  desc: "Del Excel caótico al club conectado. Termina en el momento estrella: la nota de “cancelada por lluvia” apareciendo en el dashboard del admin.",
};

const VIDEOS = [
  { img: "/landing/02-dashboard.png", title: "El dashboard del director", dur: "3:00" },
  { img: "/landing/04-import-excel-drive.png", title: "Del Excel a SportApp", dur: "4:00" },
  { img: "/landing/06-ejercicios.png", title: "La biblioteca de ejercicios", dur: "3:00" },
  { img: "/landing/13-sedes.png", title: "Multi-sede en acción", dur: "3:00" },
  { img: "/landing/10-configuracion.png", title: "Invita a tu equipo", dur: "2:00" },
  { img: "/landing/07-doc-enlace.png", title: "Documentos y material táctico", dur: "2:30" },
];

export function VideosSection() {
  return (
    <section id="videos" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Vídeos
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Míralo funcionando. 2 minutos y lo entiendes todo.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Ves cómo se hace cada cosa y cómo se ve la app de verdad.
          </p>
        </Reveal>

        {/* Vídeo destacado */}
        <Reveal delay={0.1} className="mt-12">
          <div className="group grid overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-primary/5 lg:grid-cols-[1.4fr_1fr]">
            <div className="relative aspect-video">
              <Image
                src={FEATURED.img}
                alt={FEATURED.title}
                fill
                className="object-cover object-top"
              />
              <div className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/30">
                <span className="grid size-16 place-items-center rounded-full bg-white/95 text-primary shadow-lg transition-transform group-hover:scale-110">
                  <Play size={26} className="ml-1 fill-primary" />
                </span>
              </div>
              <span className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                {FEATURED.dur}
              </span>
            </div>
            <div className="flex flex-col justify-center p-7">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Destacado
              </span>
              <h3 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-foreground">
                {FEATURED.title}
              </h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                {FEATURED.desc}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Rejilla */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VIDEOS.map((v, i) => (
            <Reveal key={v.title} delay={(i % 3) * 0.06}>
              <div className="group overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="relative aspect-video">
                  <Image src={v.img} alt={v.title} fill className="object-cover object-top" />
                  <div className="absolute inset-0 grid place-items-center bg-black/15 transition-colors group-hover:bg-black/25">
                    <span className="grid size-12 place-items-center rounded-full bg-white/95 text-primary shadow transition-transform group-hover:scale-110">
                      <Play size={18} className="ml-0.5 fill-primary" />
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {v.dur}
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-foreground">{v.title}</h4>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Miniaturas con capturas reales del producto. Sustituye el enlace por el
          reproductor embebido (YouTube/Vimeo) al publicar.
        </p>
      </div>
    </section>
  );
}
