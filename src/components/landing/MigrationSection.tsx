import Image from "next/image";
import { Upload, Wand2, Link2, FileCheck2, Download } from "lucide-react";
import { Reveal } from "./Reveal";

const PUNTOS = [
  { icon: Wand2, title: "Reconoce tus encabezados", body: "“Teléfono”, “Móvil” o “Tel.”; “Coach” en vez de “Entrenador”. Acepta sinónimos y normaliza acentos y mayúsculas." },
  { icon: Link2, title: "Conecta por nombre", body: "Escribes “Sede Norte” en la pestaña de equipos y lo vincula a la sede real. Nada de IDs ni UUIDs." },
  { icon: FileCheck2, title: "No duplica y te da un parte", body: "Idempotente: si reimportas, omite lo que ya existe. Y ves cuántos registros se crearon y en qué fila hubo un problema." },
];

export function MigrationSection() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Migración
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Ya tienes tus datos en un Excel. Tráelos tal cual.
          </h2>
          <p className="mt-4 text-muted-foreground">
            SportApp lee tu hoja de cálculo — la tuya, con tus nombres de columna —
            y lo conecta todo. No tienes que aprender un formato nuevo ni renombrar
            nada. ¿Vive en Google? Pega la URL de tu Google Sheets o Drive.
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-primary/5">
              <Image
                src="/landing/04-import-excel-drive.png"
                alt="Diálogo de importación: archivo, URL de Google Sheets/Drive y plantilla"
                width={2000}
                height={1250}
                className="h-auto w-full"
              />
            </div>
          </Reveal>

          <div className="space-y-4">
            {PUNTOS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <p.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {p.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Pasos */}
        <Reveal delay={0.1} className="mt-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Upload, n: "1", t: "Sube", d: "Tu .xlsx o la URL de Google Sheets/Drive." },
              { icon: Wand2, n: "2", t: "SportApp entiende", d: "Reconoce columnas y vincula por nombre, respetando dependencias." },
              { icon: Download, n: "3", t: "Listo y conectado", d: "Sedes, equipos, jugadores y sesiones ya enlazados entre sí." },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                    {s.n}
                  </span>
                  <s.icon size={18} className="text-primary" />
                </div>
                <h4 className="mt-3 font-semibold text-foreground">{s.t}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
          <div className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
            <p className="text-foreground">
              <span className="font-semibold">Y al revés:</span> exporta todo el
              club a Excel con un clic, con nombres legibles. Entras y sales con tu
              Excel cuando quieras.{" "}
              <span className="font-semibold text-primary">Sin lock-in.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
