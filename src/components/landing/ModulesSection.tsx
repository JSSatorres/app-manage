import Image from "next/image";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Dumbbell,
  Building2,
  Shield,
  ClipboardList,
  User,
  Users,
  Settings,
} from "lucide-react";
import { Reveal } from "./Reveal";

interface FeatureRow {
  icon: typeof BarChart3;
  name: string;
  headline: string;
  body: string;
  conecta: string;
  img: string;
  alt: string;
}

const ROWS: FeatureRow[] = [
  {
    icon: BarChart3,
    name: "Dashboard",
    headline: "El pulso del club",
    body: "Vista semanal de todas las sesiones, con selector de días y contador, mini-calendario mensual y filtros por sede, periodo y estado. Haces clic en una sesión y ves su ficha completa sin cambiar de página.",
    conecta: "sesiones, equipos, sedes y las notas del entrenador",
    img: "/landing/01-dashboard.png",
    alt: "Dashboard semanal con calendario y estados de sesión",
  },
  {
    icon: CalendarDays,
    name: "Sesiones",
    headline: "Del plan al informe, con programación en lote",
    body: "Estados Borrador → Planificada → Realizada / No realizada, multi-entrenador, microciclo y objetivo. No creas las sesiones una a una: eliges un rango de fechas, los días de la semana y hasta franjas horarias, y se generan todas de golpe.",
    conecta: "equipos, entrenadores, ejercicios, documentos y el dashboard",
    img: "/landing/02-nueva-sesion.png",
    alt: "Formulario de sesión con programación recurrente",
  },
  {
    icon: FileText,
    name: "Documentos",
    headline: "El Drive, pero con sentido",
    body: "Sube archivos a almacenamiento seguro o enlaza recursos externos (YouTube, Vimeo, Google Drive, web). Categorízalos y decide su visibilidad: todos los entrenadores o solo algunos. Asócialos a sedes, equipos, ejercicios o sesiones.",
    conecta: "todo — un documento siempre sabe a qué pertenece",
    img: "/landing/05-documentos.png",
    alt: "Tabla de documentos con tipo, categoría y sedes",
  },
  {
    icon: Dumbbell,
    name: "Ejercicios",
    headline: "Tu biblioteca de entrenamiento",
    body: "Catálogo con objetivo principal y nº mínimo de jugadores. Cada ejercicio puede ser global del club o propio de una sede, y lleva documentos adjuntos. Al montar una sesión, se eligen con orden, tiempo de ejecución, descanso y variante.",
    conecta: "sesiones y documentos",
    img: "/landing/06-ejercicios.png",
    alt: "Biblioteca de ejercicios del club",
  },
];

const GRID = [
  {
    icon: Building2,
    name: "Sedes",
    body: "Cada centro con sus equipos, entrenadores, jugadores y documentos. Acordeón expandible. Cambia el nombre aquí y cambia en todas partes.",
  },
  {
    icon: Shield,
    name: "Equipos",
    body: "Categoría y sede. Entrenadores y jugadores asignados con relaciones muchos-a-muchos reales, sin duplicar a nadie.",
  },
  {
    icon: ClipboardList,
    name: "Entrenadores",
    body: "Titulación, contacto y notas. Un entrenador puede estar en varias sedes y equipos, con cuenta de acceso vinculada o como simple registro.",
  },
  {
    icon: User,
    name: "Jugadores",
    body: "Dorsal, posición, pie dominante y datos del tutor (clave en base). Multi-sede y multi-equipo. Su ficha deja de vivir en una fila de Excel.",
  },
  {
    icon: Users,
    name: "Usuarios",
    body: "Invitas por enlace y asignas rol; la persona se registra y queda vinculada a la sede correcta. Accesos centralizados.",
  },
  {
    icon: Settings,
    name: "Parámetros",
    body: "Tipos de objetivo, de contenido, material y categorías de edad. La app se adapta a tu vocabulario, no al revés.",
  },
];

export function ModulesSection() {
  return (
    <section id="funciones" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            Recorrido
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            Nueve módulos, un mismo dato conectado
          </h2>
          <p className="mt-4 text-muted-foreground">
            Cada módulo resuelve una parte del club — y todos hablan entre sí.
          </p>
        </Reveal>

        <div className="mt-14 space-y-16">
          {ROWS.map((r, i) => (
            <Reveal key={r.name}>
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                    <r.icon size={14} />
                    {r.name}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-foreground">
                    {r.headline}
                  </h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {r.body}
                  </p>
                  <p className="mt-4 text-sm">
                    <span className="font-semibold text-foreground">
                      ↔ Conecta con:
                    </span>{" "}
                    <span className="text-muted-foreground">{r.conecta}</span>
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-primary/5">
                  <Image
                    src={r.img}
                    alt={r.alt}
                    width={2000}
                    height={1250}
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Resto de módulos en rejilla */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GRID.map((m, i) => (
            <Reveal key={m.name} delay={(i % 3) * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <m.icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {m.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {m.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
