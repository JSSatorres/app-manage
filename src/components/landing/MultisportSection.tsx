import Image from "next/image";
import { Dumbbell, UsersRound } from "lucide-react";

export function MultisportSection() {
  return (
    <section className="overflow-hidden text-white" style={{ backgroundColor: "#101b52" }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-balance text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl">Un club. Muchos deportes. La misma forma de trabajar.</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/75">SportApp no obliga a pensar como un club de fútbol. Configura categorías, objetivos, materiales y posiciones según tu deporte.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: "#70e2c0", color: "#101b52" }}><UsersRound size={16} /> Clubes y academias</span>
              <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: "#ffb6a3", color: "#101b52" }}><Dumbbell size={16} /> Sesiones a medida</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="relative overflow-hidden rounded-3xl" style={{ aspectRatio: "4 / 5" }}>
              <Image src="/landing/equipo-entrenando.png" alt="Equipo de fútbol entrenando en el campo" fill unoptimized sizes="(max-width: 1024px) 50vw, 32vw" className="object-cover" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: "#3358ff" }}>Fútbol</span>
            </div>
            <div className="relative mt-10 overflow-hidden rounded-3xl" style={{ aspectRatio: "4 / 5" }}>
              <Image src="/landing/equipo-voleibol.png" alt="Equipo de voleibol preparando un ejercicio" fill unoptimized sizes="(max-width: 1024px) 50vw, 32vw" className="object-cover" />
              <span className="absolute bottom-4 left-4 rounded-full bg-white px-3 py-1 text-xs font-bold" style={{ color: "#3358ff" }}>Voleibol</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
