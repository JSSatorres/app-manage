"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useAppNavigation } from "@/components/shared/AppLink";

export default function LoginPage() {
  const { replace } = useAppNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRedirectTo = (nextPath: string) => {
    const next = encodeURIComponent(nextPath);
    return `${window.location.origin}/auth/callback?next=${next}`;
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">Accede con Supabase Auth</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setErrorMessage(null);
            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: {
                redirectTo: getRedirectTo("/dashboard"),
              },
            });
            if (error) {
              setLoading(false);
              setErrorMessage(error.message);
            }
          }}
        >
          Continuar con Google
        </Button>

        <Button
          type="button"
          className="w-full"
          disabled={loading || !email.trim() || password.length < 6}
          onClick={async () => {
            setLoading(true);
            setErrorMessage(null);
            const supabase = getSupabaseClient();
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
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading || !email.trim() || password.length < 6}
          onClick={async () => {
            setLoading(true);
            setErrorMessage(null);
            const supabase = getSupabaseClient();
            const { error } = await supabase.auth.signUp({
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
          }}
        >
          Crear cuenta
        </Button>
      </div>
    </div>
  );
}

