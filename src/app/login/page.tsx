"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useAppNavigation } from "@/components/shared/AppLink";
import { AppLink } from "@/components/shared/AppLink";
import { BrandMark } from "@/components/shared/BrandMark";
import { WAITLIST_PATH } from "@/lib/constants";
import { useRequestLock } from "@/providers/request-lock-provider";

function getOAuthRedirectTo(nextPath: string) {
  const next = encodeURIComponent(nextPath);
  return `${window.location.origin}/auth/callback?next=${next}`;
}

export default function LoginPage() {
  const { replace } = useAppNavigation();
  const { pending, run } = useRequestLock();
  const inFlightRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      await run(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setErrorMessage("Faltan variables de entorno de Supabase en el cliente");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }
    setLoading(false);
    replace("/dashboard");
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      await run(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setErrorMessage("Faltan variables de entorno de Supabase en el cliente");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: getOAuthRedirectTo("/dashboard") },
    });
    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
    }
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-6">
      {/* Halo de marca */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-chart-1/25 via-chart-6/15 to-transparent blur-3xl" />
      {/* Logo */}
      <div className="relative mb-6 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-chart-1 to-chart-6 text-white shadow-[0_6px_16px_-4px_rgb(99_102_241/0.55)]">
          <BrandMark className="size-[22px]" />
        </div>
        <span className="text-[18px] font-semibold tracking-[-0.01em] text-foreground">Sport<span className="text-primary">App</span></span>
      </div>

      <div className="relative w-full max-w-[400px] space-y-6 rounded-2xl border border-border bg-card p-7 shadow-float sm:p-8">
          <div className="space-y-1">
            <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-foreground">
              Iniciar sesión
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Accede a tu cuenta de SportApp
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-[6px]">
              <Label htmlFor="email" className="text-[12.5px] font-medium text-foreground/80">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                disabled={loading || pending}
                className="h-10 text-[14px]"
              />
            </div>
            <div className="space-y-[6px]">
              <Label htmlFor="password" className="text-[12.5px] font-medium text-foreground/80">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                disabled={loading || pending}
                className="h-10 text-[14px]"
              />
            </div>

            {errorMessage && (
              <p className="text-[13px] text-destructive">{errorMessage}</p>
            )}

            <Button
              type="button"
              className="h-10 w-full text-[14px] font-semibold"
              disabled={loading || pending || !email.trim() || password.length < 6}
              onClick={handleEmailLogin}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-[11px] text-muted-foreground">
                  o
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading || pending}
              onClick={handleGoogleLogin}
              className="flex h-10 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground shadow-card transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>
            <p className="text-center text-[12px] text-muted-foreground">
              Solo para cuentas ya registradas.
            </p>
          </div>

          <p className="text-center text-[13px] text-muted-foreground">
            ¿Todavía no tienes acceso?{" "}
            <AppLink
              href={WAITLIST_PATH}
              className="font-semibold text-primary hover:underline"
            >
              Unirme a la lista de espera
            </AppLink>
          </p>
        </div>
    </div>
  );
}
