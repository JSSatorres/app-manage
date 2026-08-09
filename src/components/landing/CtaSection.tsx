"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function CtaSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No se ha podido enviar la solicitud.");
      }

      setEmail("");
      setStatus("success");
      setMessage("¡Listo! Te avisaremos cuando SportApp esté preparado para tu club.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se ha podido enviar la solicitud.");
    }
  }

  return (
    <section id="lista-espera" className="border-t border-border bg-card" style={{ scrollMarginTop: "5rem" }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="overflow-hidden rounded-md bg-primary px-6 py-12 text-center text-white shadow-xl shadow-primary/15 sm:px-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">Acceso anticipado</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-[-0.03em] sm:text-5xl">
            Tu club merece una operativa más sencilla.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-white/80">
            Apúntate a la lista de espera. La solicitud llega directamente al equipo de Satorus y no almacenamos tu correo en la aplicación.
          </p>
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" noValidate>
            <label className="sr-only" htmlFor="waitlist-email">Correo electrónico</label>
            <input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@club.es"
              className="h-12 min-w-0 flex-1 rounded-none border border-white/30 bg-card px-4 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-white/50"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="h-12 rounded-none bg-card px-6 text-sm font-semibold text-primary transition hover:bg-card/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending" ? "Enviando…" : "Quiero entrar"}
            </button>
          </form>
          {message && (
            <p role="status" className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-sm text-white">
              <CheckCircle2 size={17} aria-hidden className={status === "error" ? "hidden" : ""} />
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
