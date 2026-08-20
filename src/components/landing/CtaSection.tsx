"use client";

import { FormEvent, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRequestLock } from "@/providers/request-lock-provider";

export function CtaSection() {
  const { pending, run } = useRequestLock();
  const inFlightRef = useRef(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setStatus("sending");
    setMessage("");

    try {
      await run(async () => {
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
      });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se ha podido enviar la solicitud.");
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <section id="lista-espera" className="border-t border-border bg-card" style={{ scrollMarginTop: "5rem" }}>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="overflow-hidden rounded-md bg-primary px-6 py-12 text-center text-foreground shadow-xl shadow-primary/15 sm:px-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/75">Acceso anticipado</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-[-0.03em] sm:text-5xl">
            Tu club merece una operativa más sencilla.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-foreground/85">
            Apúntate a la lista de espera. La solicitud llega directamente al equipo de Satorus y no almacenamos tu correo en la aplicación.
          </p>
          <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="waitlist-email">Correo electrónico</label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              aria-describedby={message ? "waitlist-feedback" : undefined}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={status === "sending" || pending}
              placeholder="tu@club.es"
              className="h-12 min-w-0 flex-1 rounded-none border border-foreground bg-card px-4 text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-4 focus-visible:ring-foreground/35"
            />
            <button
              type="submit"
              disabled={status === "sending" || pending}
              className="h-12 rounded-none bg-foreground px-6 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending" ? "Enviando…" : "Quiero entrar"}
            </button>
          </form>
          {message && (
            <p
              id="waitlist-feedback"
              role={status === "error" ? "alert" : "status"}
              className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 text-sm text-foreground"
            >
              {status === "success" && <CheckCircle2 size={17} aria-hidden />}
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
