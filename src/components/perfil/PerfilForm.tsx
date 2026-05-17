"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";

const perfilSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

function getInitials(name: string | undefined, email: string | undefined): string {
  const source = (name && name.trim()) || (email ? email.split("@")[0] : "");
  if (!source) return "U";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[1][0]!).toUpperCase();
}

export function PerfilForm() {
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { full_name: "" },
  });

  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    queueMicrotask(() => {
      reset({ full_name: meta.full_name ?? meta.name ?? "" });
      setAvatarUrl(meta.avatar_url || undefined);
    });
  }, [user, reset]);

  const onSubmit = async (values: PerfilFormValues) => {
    setStatusMessage(null);
    setErrorMessage(null);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("No hay cliente de Supabase disponible");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      data: { full_name: values.full_name },
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setStatusMessage("Perfil actualizado");
    reset(values);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setErrorMessage("No hay cliente de Supabase disponible");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      setErrorMessage(`Error subiendo imagen: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    if (updateError) {
      setErrorMessage(updateError.message);
      setUploading(false);
      return;
    }

    setAvatarUrl(publicUrl);
    setStatusMessage("Avatar actualizado");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const initials = getInitials(meta.full_name ?? meta.name, user?.email);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="size-20 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-2 ring-primary/20 relative">
            <span className="text-2xl font-bold text-white">{initials}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="absolute inset-0 size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "Subiendo..." : "Cambiar imagen"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG, JPG o WEBP. Máx 2 MB recomendado.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">
                El email no se puede modificar desde aquí.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                autoComplete="name"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {statusMessage && (
              <p className="text-sm text-emerald-600">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
