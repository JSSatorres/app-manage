"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { LogOut, User as UserIcon, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";
import { useRequestLock } from "@/providers/request-lock-provider";
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

export function UserMenu({ variant }: { variant?: "sidebar" | "topbar" } = {}) {
  const router = useRouter();
  const { user } = useAuth();
  const { pending, run } = useRequestLock();
  const [signingOut, setSigningOut] = useState(false);
  const signOutInFlightRef = useRef(false);

  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const fullName = meta.full_name ?? meta.name;
  const avatarUrl = meta.avatar_url || undefined;
  const email = user?.email ?? "";
  const initials = getInitials(fullName, email);

  const handleSignOut = async () => {
    if (pending || signOutInFlightRef.current) return;

    signOutInFlightRef.current = true;
    setSigningOut(true);

    try {
      await run(async () => {
        const supabase = getSupabaseClient();
        if (supabase) await supabase.auth.signOut();
        router.replace("/login");
      });
    } finally {
      signOutInFlightRef.current = false;
      setSigningOut(false);
    }
  };

  const navigate = (href: string) => {
    if (!pending) router.push(href);
  };

  const displayName = fullName || email.split("@")[0] || "Usuario";

  const menuContent = (
    <DropdownMenuContent align="end" sideOffset={8} className="w-60 border-2 border-foreground bg-card p-1">
      <div className="px-3 py-3">
        <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
        {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate("/perfil")} disabled={pending} aria-disabled={pending}><UserIcon /><span>Perfil</span></DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate("/configuracion")} disabled={pending} aria-disabled={pending}><Settings /><span>Configuración</span></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={handleSignOut} disabled={pending || signingOut} aria-disabled={pending || signingOut}><LogOut /><span>Cerrar sesión</span></DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (variant === "sidebar") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menú de usuario"
          className="flex min-h-11 w-full items-center gap-[10px] px-[10px] py-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sidebar-ring group-data-[collapsible=icon]:justify-center"
        >
          <div className="relative size-[30px] shrink-0 rounded-lg bg-primary overflow-hidden flex items-center justify-center">
            <span className="text-[11px] font-bold text-white">{initials}</span>
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
            )}
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-[13px] font-semibold leading-tight text-sidebar-accent-foreground truncate">{displayName}</p>
            <p className="text-[11.5px] text-sidebar-foreground/60 mt-0.5">Administrador</p>
          </div>
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="relative flex size-11 items-center justify-center overflow-hidden border border-foreground bg-secondary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      >
        <span className="text-xs font-bold text-foreground">{initials}</span>
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
      {menuContent}
    </DropdownMenu>
  );
}
