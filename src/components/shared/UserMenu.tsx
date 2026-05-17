"use client";

import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, KeyRound, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | undefined, email: string | undefined): string {
  const source = (name && name.trim()) || (email ? email.split("@")[0] : "");
  if (!source) return "U";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return source[0]?.toUpperCase() ?? "U";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[1][0]!).toUpperCase();
}

export function UserMenu() {
  const router = useRouter();
  const { user } = useAuth();

  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = meta.full_name ?? meta.name;
  const avatarUrl = meta.avatar_url || undefined;
  const email = user?.email ?? "";
  const initials = getInitials(fullName, email);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="relative size-9 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/20 overflow-hidden focus:outline-none focus-visible:ring-primary/40"
      >
        <span className="text-xs font-bold text-white">{initials}</span>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="px-2 py-2">
          <p className="text-sm font-semibold leading-tight truncate">
            {fullName || email.split("@")[0] || "Usuario"}
          </p>
          {email && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {email}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/perfil")}>
          <UserIcon />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/perfil/contrasena")}>
          <KeyRound />
          <span>Cambiar contraseña</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/configuracion")}>
          <Settings />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}