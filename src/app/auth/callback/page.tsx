"use client";

import { useEffect, useState } from "react";
import { useAppNavigation } from "@/components/shared/AppLink";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { getSupabaseClient } from "@/services/supabase";

export default function AuthCallbackPage() {
  const { replace } = useAppNavigation();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextRaw = params.get("next");
    const next =
      nextRaw && nextRaw.startsWith("/") ? nextRaw : "/dashboard";

    const supabase = getSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        replace(next);
        return;
      }
      setMessage("No se pudo completar el inicio de sesión");
      replace("/login");
    });
  }, [replace]);

  if (message) return <p className="p-6 text-sm text-destructive">{message}</p>;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
