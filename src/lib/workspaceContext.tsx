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
import { normalizeRol, type Rol } from "@/lib/permisos";

const STORAGE_SEDE_KEY = "sportapp_active_sede_id";
const STORAGE_WORKSPACE_KEY = "sportapp_active_workspace_id";

export interface SedeOption {
  id: string;
  nombre: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
  sedes: SedeOption[];
}

interface AppContextValue {
  ready: boolean;
  // Workspace activo (club)
  activeWorkspace: WorkspaceOption | null;
  workspaces: WorkspaceOption[];
  setActiveWorkspace: (ws: WorkspaceOption | null) => void;
  // Sede activa dentro del workspace
  activeSede: SedeOption | null;
  sedesDisponibles: SedeOption[];
  setActiveSede: (sede: SedeOption | null) => void;
  // Rol (canónico) en el workspace activo
  rol: Rol | null;
  // Flags de rol reales (no alias)
  isSuperAdmin: boolean;
  isAdmin: boolean;          // dueño/admin del club
  isGerenteSede: boolean;    // gestor acotado a una sede
  isEntrenador: boolean;
  isJugador: boolean;
  // Helpers derivados de uso frecuente
  canManageClub: boolean;    // superadmin | admin
  canManageSede: boolean;    // superadmin | admin | gerente_sede
  isReadOnly: boolean;       // jugador
  // Estado
  needsOnboarding: boolean;
  bootstrapErrorMessage: string | null;
  refresh: () => Promise<void>;
  activeWorkspaceId: string | null;
  sedeIds: string[];
}

export type WorkspaceContextValue = AppContextValue;

const AppContext = createContext<AppContextValue | null>(null);

async function loadWorkspaces(uid: string): Promise<{
  workspaces: WorkspaceOption[];
  errorMessage: string | null;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) return { workspaces: [], errorMessage: "Faltan variables de entorno de Supabase" };

  // Cargar memberships con workspace y sedes
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name), sedes:workspaces(sedes(id, nombre))")
    .eq("user_id", uid);

  if (error) return { workspaces: [], errorMessage: error.message };
  if (!data || data.length === 0) return { workspaces: [], errorMessage: null };

  // La query anidada no funciona bien con el cliente JS de Supabase para relaciones indirectas,
  // así que cargamos workspace y sedes por separado
  const workspaceIds = data.map((m) => m.workspace_id);

  const { data: wsData, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name")
    .in("id", workspaceIds)
    .order("name", { ascending: true });

  if (wsError) return { workspaces: [], errorMessage: wsError.message };

  const { data: sedesData, error: sedesError } = await supabase
    .from("sedes")
    .select("id, nombre, workspace_id")
    .in("workspace_id", workspaceIds)
    .order("nombre", { ascending: true });

  if (sedesError) return { workspaces: [], errorMessage: sedesError.message };

  // Obtener la sede asignada al usuario para filtrar si no es admin de workspace
  const { data: usuarioData } = await supabase
    .from("usuarios")
    .select("sede_id")
    .eq("id", uid)
    .single();
  const userSedeId = usuarioData?.sede_id as string | null | undefined;

  const workspaces: WorkspaceOption[] = (wsData ?? []).map((ws) => {
    const membership = data.find((m) => m.workspace_id === ws.id);
    const isWorkspaceAdmin = membership?.role === "admin";
    const allWsSedes = (sedesData ?? []).filter((s) => s.workspace_id === ws.id);
    // Admin de workspace ve todas las sedes; resto solo su sede asignada
    const visibleSedes = isWorkspaceAdmin
      ? allWsSedes
      : allWsSedes.filter((s) => s.id === userSedeId);
    const sedes = visibleSedes.map((s) => ({ id: s.id, nombre: s.nombre as string }));
    return {
      id: ws.id,
      name: ws.name as string,
      role: membership?.role ?? "viewer",
      sedes,
    };
  });

  return { workspaces, errorMessage: null };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceOption | null>(null);
  const [activeSede, setActiveSedeState] = useState<SedeOption | null>(null);
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string | null>(null);

  const bootstrap = useCallback(async (uid: string, userMeta: Record<string, string | undefined>) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Sincronizar perfil en public.usuarios
    await supabase.rpc("sync_auth_profile", {
      p_full_name: userMeta.full_name ?? userMeta.name ?? undefined,
    });

    const { workspaces: wsList, errorMessage } = await loadWorkspaces(uid);
    setBootstrapErrorMessage(errorMessage);
    setWorkspaces(wsList);

    if (wsList.length === 0) {
      // Sin workspace → necesita onboarding
      setActiveWorkspaceState(null);
      setActiveSedeState(null);
      setReady(true);
      return;
    }

    // Restaurar workspace activo desde localStorage
    const storedWsId = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_WORKSPACE_KEY)
      : null;
    const restoredWs = storedWsId
      ? wsList.find((w) => w.id === storedWsId)
      : null;
    const activeWs = restoredWs ?? wsList[0];
    setActiveWorkspaceState(activeWs);

    // Restaurar sede activa dentro del workspace
    const storedSedeId = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_SEDE_KEY)
      : null;
    const restoredSede = storedSedeId
      ? activeWs.sedes.find((s) => s.id === storedSedeId)
      : null;
    setActiveSedeState(restoredSede ?? activeWs.sedes[0] ?? null);

    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    setReady(false);
    const { workspaces: wsList, errorMessage } = await loadWorkspaces(uid);
    setBootstrapErrorMessage(errorMessage);
    setWorkspaces(wsList);

    if (wsList.length === 0) {
      setActiveWorkspaceState(null);
      setActiveSedeState(null);
      setReady(true);
      return;
    }

    const storedWsId = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_WORKSPACE_KEY)
      : null;
    const restoredWs = storedWsId ? wsList.find((w) => w.id === storedWsId) : null;
    const activeWs = restoredWs ?? wsList[0];
    setActiveWorkspaceState(activeWs);

    const storedSedeId = typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_SEDE_KEY)
      : null;
    const restoredSede = storedSedeId
      ? activeWs.sedes.find((s) => s.id === storedSedeId)
      : null;
    setActiveSedeState(restoredSede ?? activeWs.sedes[0] ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      queueMicrotask(() => {
        setReady(false);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setActiveSedeState(null);
        setBootstrapErrorMessage(null);
      });
      return;
    }
    const meta = session.user.user_metadata as Record<string, string | undefined>;
    const uid = session.user.id;
    queueMicrotask(() => { bootstrap(uid, meta).catch(() => undefined); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, bootstrap]);

  const setActiveWorkspace = useCallback((ws: WorkspaceOption | null) => {
    setActiveWorkspaceState(ws);
    if (typeof window !== "undefined") {
      if (ws) {
        window.localStorage.setItem(STORAGE_WORKSPACE_KEY, ws.id);
        // Resetear sede al cambiar workspace
        const firstSede = ws.sedes[0] ?? null;
        setActiveSedeState(firstSede);
        if (firstSede) window.localStorage.setItem(STORAGE_SEDE_KEY, firstSede.id);
        else window.localStorage.removeItem(STORAGE_SEDE_KEY);
      } else {
        window.localStorage.removeItem(STORAGE_WORKSPACE_KEY);
        window.localStorage.removeItem(STORAGE_SEDE_KEY);
        setActiveSedeState(null);
      }
    }
  }, []);

  const setActiveSede = useCallback((sede: SedeOption | null) => {
    setActiveSedeState(sede);
    if (typeof window !== "undefined") {
      if (sede) window.localStorage.setItem(STORAGE_SEDE_KEY, sede.id);
      else window.localStorage.removeItem(STORAGE_SEDE_KEY);
    }
  }, []);

  const rol = normalizeRol(activeWorkspace?.role);
  const isSuperAdmin = rol === "superadmin";
  const isAdmin = rol === "admin";
  const isGerenteSede = rol === "gerente_sede";
  const isEntrenador = rol === "entrenador";
  const isJugador = rol === "jugador";
  const canManageClub = isSuperAdmin || isAdmin;
  const canManageSede = isSuperAdmin || isAdmin || isGerenteSede;
  const isReadOnly = isJugador;
  const needsOnboarding = ready && workspaces.length === 0;

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      activeWorkspace,
      workspaces,
      setActiveWorkspace,
      activeSede,
      sedesDisponibles: activeWorkspace?.sedes ?? [],
      setActiveSede,
      rol,
      isSuperAdmin,
      isAdmin,
      isGerenteSede,
      isEntrenador,
      isJugador,
      canManageClub,
      canManageSede,
      isReadOnly,
      needsOnboarding,
      bootstrapErrorMessage,
      refresh,
      activeWorkspaceId: activeWorkspace?.id ?? null,
      sedeIds: activeSede ? [activeSede.id] : [],
    }),
    [
      ready,
      activeWorkspace,
      workspaces,
      setActiveWorkspace,
      activeSede,
      setActiveSede,
      rol,
      isSuperAdmin,
      isAdmin,
      isGerenteSede,
      isEntrenador,
      isJugador,
      canManageClub,
      canManageSede,
      isReadOnly,
      needsOnboarding,
      bootstrapErrorMessage,
      refresh,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useWorkspaceContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
