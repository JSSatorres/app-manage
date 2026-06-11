import { Check, X } from "lucide-react";
import { Reveal } from "./Reveal";

const FILAS: { necesitas: string; excel: string; sportapp: string }[] = [
  { necesitas: "Mover un jugador de equipo", excel: "Borras de una pestaña, pegas en otra y rezas por no equivocarte de fila", sportapp: "Lo asignas una vez; ficha, equipo y sesiones se actualizan solas" },
  { necesitas: "Saber qué pasó en el entreno del sábado", excel: "Preguntas por WhatsApp y esperas", sportapp: "Lo lees en el dashboard: estado + nota del entrenador" },
  { necesitas: "Una cancelación por lluvia", excel: "Un mensaje que se pierde en el grupo", sportapp: "Estado No realizada + motivo, registrado para siempre" },
  { necesitas: "Encontrar el vídeo de un ejercicio", excel: "“¿En qué carpeta estaba?”", sportapp: "Adjunto al ejercicio y a la sesión donde se usó. Un clic" },
  { necesitas: "Permisos por persona", excel: "Compartes el Drive entero o nada", sportapp: "Cada rol ve y edita solo lo suyo (5 niveles, ver/modificar)" },
  { necesitas: "Datos al día", excel: "Tantas versiones como personas", sportapp: "Un único dato vivo, siempre el bueno" },
  { necesitas: "Trabajar desde el móvil en el campo", excel: "Excel en el móvil es una tortura", sportapp: "App responsive con navegación inferior" },
  { necesitas: "Empezar con tus datos actuales", excel: "—", sportapp: "Importas tu Excel tal cual y SportApp lo conecta solo" },
  { necesitas: "Planificar un mes de entrenamientos", excel: "30 filas copiadas a mano", sportapp: "Rango de fechas + días + franjas → todas de golpe" },
  { necesitas: "Riesgo de pérdida", excel: "Un archivo borrado o sobreescrito es catastrófico", sportapp: "Base de datos gestionada con copias de seguridad" },
];

export function ComparisonSection() {
  return (
    <section className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Lo que un Excel y un Drive nunca podrán hacer
          </h2>
          <p className="mt-4 text-muted-foreground">
            Fila por fila, por qué un sistema conectado gana a una tabla suelta y
            una carpeta compartida.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 overflow-hidden rounded-2xl border border-border">
          {/* Cabecera (solo desktop) */}
          <div className="hidden bg-muted/60 md:grid md:grid-cols-[1.1fr_1.4fr_1.4fr]">
            <div className="px-5 py-3.5 text-sm font-semibold text-foreground">
              Lo que necesitas hacer
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-muted-foreground">
              <X size={15} className="text-rose-500" /> Excel + Drive
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-primary">
              <Check size={15} /> SportApp
            </div>
          </div>

          {FILAS.map((f, i) => (
            <div
              key={f.necesitas}
              className={`grid gap-px md:grid-cols-[1.1fr_1.4fr_1.4fr] ${
                i % 2 ? "bg-muted/20" : "bg-white"
              }`}
            >
              <div className="border-t border-border px-5 py-4 text-sm font-semibold text-foreground">
                {f.necesitas}
              </div>
              <div className="flex items-start gap-2 px-5 py-4 text-sm text-muted-foreground md:border-t md:border-border">
                <X size={15} className="mt-0.5 shrink-0 text-rose-400 md:hidden" />
                {f.excel}
              </div>
              <div className="flex items-start gap-2 border-t border-border px-5 py-4 text-sm text-foreground">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                {f.sportapp}
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
          <div className="rounded-2xl border border-border bg-primary/5 p-6 text-center">
            <p className="text-lg text-foreground">
              Excel y Drive son geniales para{" "}
              <span className="font-semibold">guardar</span> datos. SportApp es
              para <span className="font-semibold">operar</span> un club. La
              diferencia es la misma que entre una libreta y un copiloto.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
