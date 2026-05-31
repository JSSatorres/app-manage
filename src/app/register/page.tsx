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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          {hasInvite
            ? "Te han invitado a unirte a una sede. Crea tu cuenta con el mismo email al que recibiste la invitación."
            : "Regístrate para acceder a SportApp"}
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValid && handleRegister()}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={loading || !isValid}
            onClick={handleRegister}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">o</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleRegister}
          >
            Continuar con Google
          </Button>
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <AppLink href="/login" className="font-medium underline underline-offset-4">
          Iniciar sesión
        </AppLink>
      </p>
    </div>
  );
}
