"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/services/supabase";
import { useWorkspaceContext } from "@/lib/workspaceContext";

const schema = z.object({
  nombreClub: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar los 80 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function CreateClubForm() {
  const { refresh } = useWorkspaceContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    setError(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("Error de configuración. Recarga la página.");
      setLoading(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("setup_workspace", {
      p_club_name: values.nombreClub,
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    await refresh();
  }

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="w-full max-w-md">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10">
            <Building2 size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Bienvenido a SportApp</h1>
            <p className="text-sm text-muted-foreground">Empieza creando tu club</p>
          </div>
        </div>

        {/* Tarjeta */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <p className="text-sm text-muted-foreground">
            Ponle nombre a tu organización. Podrás cambiarlo cuando quieras
            desde Configuración.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombreClub">Nombre del club</Label>
              <Input
                id="nombreClub"
                placeholder="Ej: Club Deportivo Norte"
                autoFocus
                {...register("nombreClub")}
              />
              {errors.nombreClub && (
                <p className="text-xs text-destructive">{errors.nombreClub.message}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={!isValid || loading}>
              {loading ? (
                "Creando tu club..."
              ) : (
                <>
                  Crear mi club
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Nota Excel */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <FileSpreadsheet size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Empezarás desde cero. Próximamente podrás importar equipos,
            jugadores y sesiones desde un archivo Excel.
          </p>
        </div>
      </div>
    </div>
  );
}
