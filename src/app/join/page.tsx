"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppNavigation } from "@/components/shared/AppLink";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";

export default function JoinPage() {
  const { session } = useAuth();
  const { replace } = useAppNavigation();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRedirectTo = (nextPath: string) => {
    const next = encodeURIComponent(nextPath);
    return `${window.location.origin}/auth/callback?next=${next}`;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  useEffect(() => {
    if (!token || !session?.user) return;
    let cancelled = false;
    const supabase = getSupabaseClient();
    void supabase
      .rpc("accept_workspace_invitation", { p_token: token })
      .then(({ error }) => {
        if (cancelled) return;
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        replace("/dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [token, session?.user?.id, replace]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Unirme a un espacio</h1>
        <p className="text-sm text-muted-foreground">
          Usa el mismo email que recibió la invitación. Si ya tienes sesión
          iniciada, se aceptará sola. Si no, entra con Google.
        </p>
      </div>

      {!token && (
        <p className="text-sm text-destructive">Falta el parámetro token en la URL.</p>
      )}

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Button
        type="button"
        disabled={loading || !token}
        className="w-full"
        onClick={async () => {
          if (!token) return;
          setLoading(true);
          setErrorMessage(null);
          const nextPath = `/join?token=${encodeURIComponent(token)}`;
          const supabase = getSupabaseClient();
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: getRedirectTo(nextPath),
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
    </div>
  );
}
