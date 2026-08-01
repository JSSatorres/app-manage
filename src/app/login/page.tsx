"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useAppNavigation } from "@/components/shared/AppLink";
import { AppLink } from "@/components/shared/AppLink";
import { WAITLIST_PATH } from "@/lib/constants";

export default function LoginPage() {
  const { replace } = useAppNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
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
  };

  return (
    <div
      className="flex min-h-screen w-full flex-col items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(51,88,255,0.08) 0%, transparent 70%), #ffffff",
      }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div
          className="flex size-8 items-center justify-center rounded-[9px]"
          style={{ background: "#3358ff" }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="size-4 text-white" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[16px] font-semibold text-foreground">SportApp</span>
      </div>

      <div
        className="w-full max-w-[400px] space-y-6 rounded-[20px] border border-border bg-white p-8 shadow-sm"
      >
          <div className="space-y-1">
            <h1
              className="text-[27px] font-semibold tracking-[-0.03em]"
              style={{ color: "#16181d" }}
            >
              Iniciar sesión
            </h1>
            <p className="text-[14px] text-muted-foreground">
              Accede a tu cuenta de SportApp
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-[6px]">
              <Label
                htmlFor="email"
                className="text-[12.5px] font-semibold"
                style={{ color: "rgba(22,24,29,0.70)" }}
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                className="rounded-[11px] border-border bg-secondary/60 px-[13px] py-[11px] text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="space-y-[6px]">
              <Label
                htmlFor="password"
                className="text-[12.5px] font-semibold"
                style={{ color: "rgba(22,24,29,0.70)" }}
              >
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                className="rounded-[11px] border-border bg-secondary/60 px-[13px] py-[11px] text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {errorMessage && (
              <p className="text-[13px] text-destructive">{errorMessage}</p>
            )}

            <Button
              type="button"
              className="h-[46px] w-full rounded-[10px] text-[14px] font-semibold"
              style={{ background: "#3358ff" }}
              disabled={loading || !email.trim() || password.length < 6}
              onClick={handleEmailLogin}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

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
