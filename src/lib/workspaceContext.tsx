"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";
import type { Rol } from "@/lib/constants";

const STORAGE_SEDE_KEY = "sportapp_active_sede_id";

export interface SedeOption {
  id: string;
  nombre: string;
}

interface AppContextValue {
  ready: boolean;
  activeSede: SedeOption | null;
  sedesDisponibles: SedeOption[];
  setActiveSede: (sede: SedeOption | null) => void;
  rol: Rol | null;
  isSuperAdmin: boolean;
  isAdminSede: boolean;
  bootstrapErrorMessage: string | null;
  refresh: () => Promise<void>;
  // Aliases de compatibilidad para código existente
  activeWorkspaceId: string | null;
  sedeIds: string[];
  memberships: WorkspaceMembership[];
  canSwitchWorkspace: boolean;
  isWorkspaceAdmin: boolean;
  ensureWorkspace: () => Promise<void>;
  reloadSedeIds: () => Promise<void>;
  setActiveWorkspaceId: (id: string | null) => void;
}

// Re-exportamos alias para no romper imports existentes que usen WorkspaceContextValue
export type WorkspaceContextValue = AppContextValue;
/** @deprecated usa SedeOption directamente */
export type WorkspaceMembership = { workspaceId: string; name: string; role: string };

const AppContext = createContext<AppContextValue | null>(null);

interface UsuarioRow {
  rol: string;
  sede_id: string | null;
}

async function loadAppState(uid: string): Promise<{
  usuario: UsuarioRow | null;
  sedes: SedeOption[];
  errorMessage: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { usuario: null, sedes: [], errorMessage: "Faltan variables de entorno de Supabase" };
  }

  const { data: u, error: ue } = await supabase
    .from("usuarios")
    .select("rol, sede_id")
    .eq("id", uid)
    .single();

  if (ue || !u) {
    return { usuario: null, sedes: [], errorMessage: ue?.message ?? "Usuario no encontrado" };
  }

  const usuario = u as UsuarioRow;

  // SuperAdmin carga todas las sedes; el resto solo la suya
  let sedes: SedeOption[] = [];
  if (usuario.rol === "SuperAdmin") {
    const { data: sedesData, error: se } = await supabase
      .from("sedes")
      .select("id, nombre")
      .order("nombre", { ascending: true });
    if (!se && sedesData) {
      sedes = sedesData.map((s) => ({ id: s.id, nombre: s.nombre as string }));
    }
  } else if (usuario.sede_id) {
    const { data: sedeData, error: se } = await supabase
      .from("sedes")
      .select("id, nombre")
      .eq("id", usuario.sede_id)
      .single();
    if (!se && sedeData) {
      sedes = [{ id: sedeData.id, nombre: sedeData.nombre as string }];
    }
  }

  return { usuario, sedes, errorMessage: null };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [rol, setRol] = useState<Rol | null>(null);
  const [sedesDisponibles, setSedesDisponibles] = useState<SedeOption[]>([]);
  const [activeSede, setActiveSedeState] = useState<SedeOption | null>(null);
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string | null>(null);

  const bootstrap = useCallback(async (uid: string, userMeta: Record<string, string | undefined>) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Sincronizar perfil (crea el usuario en public.usuarios si no existe)
    await supabase.rpc("sync_auth_profile", {
      p_full_name: userMeta.full_name ?? userMeta.name ?? null,
    });

    // Crear sede por defecto si es AdminSede sin sede
    await supabase.rpc("setup_user_sede");

    const { usuario, sedes, errorMessage } = await loadAppState(uid);
    setBootstrapErrorMessage(errorMessage);
    if (!usuario) { setReady(true); return; }

    setRol(usuario.rol as Rol);
    setSedesDisponibles(sedes);

    // Restaurar sede activa desde localStorage
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_SEDE_KEY)
      : null;
    const restored = stored ? sedes.find((s) => s.id === stored) : null;
    setActiveSedeState(restored ?? sedes[0] ?? null);
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    setReady(false);
    const { usuario, sedes, errorMessage } = await loadAppState(uid);
    setBootstrapErrorMessage(errorMessage);
    if (!usuario) { setReady(true); return; }
    setRol(usuario.rol as Rol);
    setSedesDisponibles(sedes);
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_SEDE_KEY)
      : null;
    const restored = stored ? sedes.find((s) => s.id === stored) : null;
    setActiveSedeState(restored ?? sedes[0] ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      queueMicrotask(() => {
        setReady(false);
        setRol(null);
        setSedesDisponibles([]);
        setActiveSedeState(null);
        setBootstrapErrorMessage(null);
      });
      return;
    }
    const meta = session.user.user_metadata as Record<string, string | undefined>;
    void bootstrap(session.user.id, meta);
  }, [authLoading, session?.user, session?.user?.id, bootstrap]);

  const setActiveSede = useCallback(
    (sede: SedeOption | null) => {
      setActiveSedeState(sede);
      if (typeof window !== "undefined") {
        if (sede) window.localStorage.setItem(STORAGE_SEDE_KEY, sede.id);
        else window.localStorage.removeItem(STORAGE_SEDE_KEY);
      }
    },
    [],
  );

  const isSuperAdmin = rol === "SuperAdmin";
  const isAdminSede  = rol === "AdminSede";

  // Compatibilidad con código que usaba activeWorkspaceId / sedeIds
  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      activeSede,
      sedesDisponibles,
      setActiveSede,
      rol,
      isSuperAdmin,
      isAdminSede,
      bootstrapErrorMessage,
      refresh,
      activeWorkspaceId: activeSede?.id ?? null,
      sedeIds: activeSede ? [activeSede.id] : [],
      memberships: [],
      canSwitchWorkspace: isSuperAdmin,
      isWorkspaceAdmin: isSuperAdmin || isAdminSede,
      ensureWorkspace: refresh,
      reloadSedeIds: refresh,
      setActiveWorkspaceId: (_id: string | null) => undefined,
    }),
    [
      ready,
      activeSede,
      sedesDisponibles,
      setActiveSede,
      rol,
      isSuperAdmin,
      isAdminSede,
      bootstrapErrorMessage,
      refresh,
    ],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
