import {
  ArrowRight,
  CalendarDays,
  Check,
  CloudRain,
  Dumbbell,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers3,
  MessageCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Reveal } from "./Reveal";

const DISPERSED_TOOLS = [
  {
    icon: FileSpreadsheet,
    title: "Jugadores_v3_FINAL.xlsx",
    detail: "Tres versiones. ¿Cuál es la buena?",
    color: "#fff0ec",
    accent: "#ff7a66",
    style: { left: "5%", top: "12%", transform: "rotate(-3deg)" },
  },
  {
    icon: FolderOpen,
    title: "Drive / ejercicios / varios",
    detail: "El vídeo estaba por aquí…",
    color: "#fff7dc",
    accent: "#d89b12",
    style: { right: "3%", top: "37%", transform: "rotate(2deg)" },
  },
  {
    icon: MessageCircle,
    title: "Grupo entrenadores",
    detail: "¿Se entrena hoy con lluvia?",
    color: "#ecfaf4",
    accent: "#159b72",
    style: { left: "12%", bottom: "8%", transform: "rotate(1deg)" },
  },
];

const CONNECTED_MODULES = [
  { icon: Users, label: "Equipos", style: { left: "4%", top: "10%" } },
  { icon: CalendarDays, label: "Sesiones", style: { right: "3%", top: "11%" } },
  { icon: Dumbbell, label: "Ejercicios", style: { left: "1%", bottom: "13%" } },
  { icon: FileText, label: "Documentos", style: { right: "0%", bottom: "13%" } },
];

const RESULTS = [
  { icon: RefreshCw, title: "Cambias una vez", detail: "Ficha, equipo y sesiones se actualizan." },
  { icon: CloudRain, title: "La lluvia deja rastro", detail: "Estado y motivo quedan registrados." },
  { icon: Play, title: "El vídeo aparece", detail: "Está unido al ejercicio y a la sesión." },
  { icon: ShieldCheck, title: "Cada persona ve lo suyo", detail: "Acceso según su trabajo en el club." },
];

export function ComparisonSection() {
  return (
    <section
      className="border-t border-white/10 text-white"
      style={{ backgroundColor: "#111d52" }}
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-5xl" style={{ letterSpacing: "-0.03em" }}>
            Tu club no debería funcionar en pestañas sueltas
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-blue-100/75 sm:text-lg">
            Excel guarda filas. Drive guarda archivos. WhatsApp guarda mensajes.
            SportApp conecta lo que ocurre entre todos ellos.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-14">
          <div className="relative grid gap-5 lg:grid-cols-2">
            <div
              className="relative overflow-hidden rounded-3xl border p-6 sm:p-8"
              style={{ backgroundColor: "#2a2448", borderColor: "rgba(255,185,171,.35)", minHeight: "430px" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#ffb9ab" }}>Herramientas dispersas</p>
                  <h3 className="mt-1 text-2xl font-bold text-white">Todo está. Nada se conecta.</h3>
                </div>
                <span className="grid size-10 place-items-center rounded-full" style={{ backgroundColor: "rgba(255,122,102,.15)", color: "#ff9b88" }}>
                  <X size={20} />
                </span>
              </div>

              <div
                className="absolute"
                style={{ left: "1.5rem", right: "1.5rem", top: "7rem", bottom: "1.25rem" }}
              >
                <div
                  className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
                  style={{ backgroundColor: "#ff7a66", filter: "blur(72px)" }}
                />
                {DISPERSED_TOOLS.map((tool) => (
                  <div
                    key={tool.title}
                    className="absolute max-w-xs rounded-2xl p-4 shadow-2xl"
                    style={{ ...tool.style, width: "78%", backgroundColor: tool.color, boxShadow: "0 18px 45px rgba(0,0,0,.24)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                        style={{ backgroundColor: tool.accent }}
                      >
                        <tool.icon size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#211f2b", overflowWrap: "anywhere" }}>{tool.title}</p>
                        <p className="mt-1 text-xs leading-5" style={{ color: "#66616f" }}>{tool.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-3xl border border-white/15 p-6 sm:p-8"
              style={{ backgroundColor: "#3358ff", minHeight: "430px" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#a9f0d5" }}>Un sistema conectado</p>
                  <h3 className="mt-1 text-2xl font-bold text-white">El dato sabe dónde pertenece.</h3>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-white/15 text-white">
                  <Check size={20} />
                </span>
              </div>

              <div
                className="absolute"
                style={{ left: "1.5rem", right: "1.5rem", top: "7rem", bottom: "1.5rem" }}
              >
                <svg
                  viewBox="0 0 500 280"
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <path d="M250 140 80 48M250 140 420 48M250 140 72 232M250 140 428 232" stroke="rgba(255,255,255,.38)" strokeWidth="2" strokeDasharray="6 7" />
                  <circle cx="250" cy="140" r="108" fill="none" stroke="rgba(255,255,255,.12)" />
                </svg>

                <div
                  className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/25 bg-white text-center shadow-2xl"
                  style={{ width: "9.5rem", height: "9.5rem" }}
                >
                  <span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: "#3358ff" }}>
                    <Layers3 size={20} />
                  </span>
                  <span className="mt-3 text-base font-bold leading-none" style={{ color: "#111d52" }}>SportApp</span>
                  <span className="mt-1.5 text-xs font-semibold leading-none" style={{ color: "#3358ff" }}>Todo conectado</span>
                </div>

                {CONNECTED_MODULES.map((module) => (
                  <div
                    key={module.label}
                    className="absolute z-20 flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2.5 text-xs font-semibold text-white shadow-lg sm:text-sm"
                    style={{ ...module.style, backgroundColor: "#203cb7" }}
                  >
                    <module.icon size={16} color="#a9f0d5" />
                    {module.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 hidden size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 bg-white shadow-xl lg:grid" style={{ borderColor: "#111d52", color: "#3358ff" }}>
              <ArrowRight size={22} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-8">
          <div className="grid overflow-hidden rounded-3xl border border-white/15 bg-white/5 sm:grid-cols-2 lg:grid-cols-4">
            {RESULTS.map((result, index) => (
              <div
                key={result.title}
                className={`p-5 sm:p-6 ${index > 0 ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}
              >
                <result.icon size={21} color="#78dfbd" />
                <p className="mt-4 font-semibold text-white">{result.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-blue-100/65">{result.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-xl leading-relaxed text-white sm:text-2xl">
            No se trata de guardar más información. Se trata de que el club
            <span className="font-bold" style={{ color: "#a9f0d5" }}> funcione como una sola pieza.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
