import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/landing/Logo";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página solicitada no existe en SportApp.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <section className="w-full max-w-2xl border-y-2 border-foreground bg-card px-6 py-12 text-center sm:px-12 sm:py-16">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Error 404
        </p>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl">
          Esta página no existe
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-muted-foreground">
          Puede que el enlace haya cambiado o que la dirección esté incompleta. Vuelve a
          la presentación de SportApp o accede con una cuenta ya habilitada.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/landing"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-foreground transition-[filter] hover:brightness-110"
          >
            Volver a SportApp
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Iniciar sesión
          </Link>
        </div>
      </section>
    </main>
  );
}
