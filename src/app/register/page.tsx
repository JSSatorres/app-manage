"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useAppNavigation, AppLink } from "@/components/shared/AppLink";

export default function RegisterPage() {
  const { replace } = useAppNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasInvite, setHasInvite] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    queueMicrotask(() => setHasInvite(!!params.get("invite")));
  }, []);

  const isValid =
    email.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const handleRegister = async () => {
    setLoading(true);
    setErrorMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setErrorMessage("Faltan variables de entorno de Supabase en el cliente");
      return;
    }
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
      return;
    }
    setLoading(false);
    if (signUpData.session) {
      replace("/dashboard");
      return;
    }
    setSuccessMessage(
      "Cuenta creada. Revisa tu email para confirmar tu cuenta y luego inicia sesión.",
    );
    setTimeout(() => replace("/login"), 4000);
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    setErrorMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      setErrorMessage("Faltan variables de entorno de Supabase en el cliente");
      return;
    }
    const next = encodeURIComponent("/dashboard");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
    if (error) {
      setLoading(false);
      setErrorMessage(error.message);
    }
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

      <div className="w-full max-w-[400px] space-y-6 rounded-[20px] border border-border bg-white p-8 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-[27px] font-semibold tracking-[-0.03em]" style={{ color: "#16181d" }}>
            Crear cuenta
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {hasInvite
              ? "Te han invitado a unirte a una sede. Crea tu cuenta con el mismo email al que recibiste la invitación."
              : "Regístrate para acceder a SportApp"}
          </p>
        </div>

        {successMessage ? (
          <div className="rounded-[11px] border border-green-200 bg-green-50 p-4 text-[13px] text-green-800">
            {successMessage}
          </div>
        ) : (
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[11px] border-border bg-secondary/60 px-[13px] py-[11px] text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <p className="text-[12px] text-muted-foreground">Mínimo 6 caracteres</p>
            </div>
            <div className="space-y-[6px]">
              <Label
                htmlFor="confirm-password"
                className="text-[12.5px] font-semibold"
                style={{ color: "rgba(22,24,29,0.70)" }}
              >
                Confirmar contraseña
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleRegister()}
                className="rounded-[11px] border-border bg-secondary/60 px-[13px] py-[11px] text-[14px] focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {confirmPassword.length > 0 && password !== confirmPassword && (
                <p className="text-[12px] text-destructive">Las contraseñas no coinciden</p>
              )}
            </div>

            {errorMessage && (
              <p className="text-[13px] text-destructive">{errorMessage}</p>
            )}

            <Button
              type="button"
              className="h-[46px] w-full rounded-[10px] text-[14px] font-semibold"
              style={{ background: "#3358ff" }}
              disabled={loading || !isValid}
              onClick={handleRegister}
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-2 text-[11px] text-muted-foreground">o</span>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleRegister}
              className="flex h-[46px] w-full items-center justify-center gap-3 rounded-[10px] border border-border bg-white text-[14px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary/60 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>
          </div>
        )}

        <p className="text-center text-[13px] text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <AppLink href="/login" className="font-semibold text-primary hover:underline">
            Iniciar sesión
          </AppLink>
        </p>
      </div>
    </div>
  );
}
