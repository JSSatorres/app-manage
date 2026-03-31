"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseClient } from "@/services/supabase";

const STORAGE_KEY = "sportapp_active_workspace_id";

export interface WorkspaceMembership {
  workspaceId: string;
  name: string;
  role: "superadmin" | "admin" | "entrenador" | "jugador";
}

interface WorkspaceContextValue {
  ready: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  memberships: WorkspaceMembership[];
  sedeIds: string[];
  isWorkspaceAdmin: boolean;
  canSwitchWorkspace: boolean;
  bootstrapErrorMessage: string | null;
  refresh: () => Promise<void>;
  ensureWorkspace: () => Promise<void>;
  reloadSedeIds: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function buildWorkspaceState(session: Session) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      list: [] as WorkspaceMembership[],
      nextId: null as string | null,
      errorMessage: "Faltan variables de entorno de Supabase en el cliente",
    };
  }
  const meta = session.user.user_metadata as {
    full_name?: string;
    name?: string;
  };
  const { error: e1 } = await supabase.rpc("sync_auth_profile", {
    p_full_name: meta?.full_name ?? meta?.name ?? null,
  });
  if (e1) {
    return { list: [], nextId: null, errorMessage: e1.message };
  }
  const { error: e2 } = await supabase.rpc("setup_user_workspaces");
  if (e2) {
    return { list: [], nextId: null, errorMessage: e2.message };
  }

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name)")
    .eq("user_id", session.user.id);

  if (error || !data) {
    return { list: [], nextId: null, errorMessage: error?.message ?? "No se pudieron cargar los espacios" };
  }

  const list: WorkspaceMembership[] = [];
  for (const row of data as unknown as Array<{
    workspace_id: string;
    role: string;
    workspaces: { id: string; name: string } | null;
  }>) {
    const w = row.workspaces;
    if (!w) continue;
    list.push({
      workspaceId: row.workspace_id,
      name: w.name,
      role:
        row.role === "superadmin"
          ? "superadmin"
          : row.role === "admin"
            ? "admin"
            : row.role === "entrenador"
              ? "entrenador"
              : "jugador",
    });
  }

  let nextId: string | null = null;
  if (typeof window !== "undefined") {
    nextId = window.localStorage.getItem(STORAGE_KEY);
  }
  if (!nextId || !list.some((m) => m.workspaceId === nextId)) {
    nextId = list[0]?.workspaceId ?? null;
  }
  return { list, nextId, errorMessage: null as string | null };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    null,
  );
  const [sedeIds, setSedeIds] = useState<string[]>([]);
  const [bootstrapErrorMessage, setBootstrapErrorMessage] = useState<string | null>(null);

  const loadSedeIds = useCallback(async (workspaceId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSedeIds([]);
      return;
    }
    const { data, error } = await supabase
      .from("sedes")
      .select("id")
      .eq("workspace_id", workspaceId);
    if (error || !data) {
      setSedeIds([]);
      return;
    }
    setSedeIds(data.map((r) => r.id));
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data: sdata } = await supabase.auth.getSession();
    const s = sdata.session;
    if (!s?.user?.id) return;
    const { list, nextId, errorMessage } = await buildWorkspaceState(s);
    setMemberships(list);
    setActiveWorkspaceIdState(nextId);
    setBootstrapErrorMessage(errorMessage);
    if (nextId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextId);
      await loadSedeIds(nextId);
    } else {
      setSedeIds([]);
    }
    setReady(true);
  }, [loadSedeIds]);

  const ensureWorkspace = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setBootstrapErrorMessage("Faltan variables de entorno de Supabase en el cliente");
      return;
    }
    const { data: sdata } = await supabase.auth.getSession();
    const s = sdata.session;
    if (!s?.user?.id) return;
    const { error } = await supabase.rpc("setup_user_workspaces");
    if (error) {
      setBootstrapErrorMessage(error.message);
      return;
    }
    await refresh();
  }, [refresh]);

  const reloadSedeIds = useCallback(async () => {
    if (!activeWorkspaceId) {
      setSedeIds([]);
      return;
    }
    await loadSedeIds(activeWorkspaceId);
  }, [activeWorkspaceId, loadSedeIds]);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setReady(false);
      setMemberships([]);
      setActiveWorkspaceIdState(null);
      setSedeIds([]);
      setBootstrapErrorMessage(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data: sdata } = await supabase.auth.getSession();
      const s = sdata.session;
      if (!s?.user?.id || cancelled) return;
      const { list, nextId, errorMessage } = await buildWorkspaceState(s);
      if (cancelled) return;
      setMemberships(list);
      setActiveWorkspaceIdState(nextId);
      setBootstrapErrorMessage(errorMessage);
      if (nextId && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, nextId);
        const { data, error } = await supabase
          .from("sedes")
          .select("id")
          .eq("workspace_id", nextId);
        if (!cancelled && !error && data) {
          setSedeIds(data.map((r) => r.id));
        }
      } else if (!cancelled) {
        setSedeIds([]);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user?.id]);

  const canSwitchWorkspace = useMemo(() => {
    return memberships.some((m) => m.role === "superadmin");
  }, [memberships]);

  const setActiveWorkspaceId = useCallback(
    (id: string | null) => {
      if (!canSwitchWorkspace) return;
      setActiveWorkspaceIdState(id);
      if (typeof window !== "undefined") {
        if (id) window.localStorage.setItem(STORAGE_KEY, id);
        else window.localStorage.removeItem(STORAGE_KEY);
      }
      if (id) void loadSedeIds(id);
      else setSedeIds([]);
    },
    [loadSedeIds, canSwitchWorkspace],
  );

  const isWorkspaceAdmin = useMemo(() => {
    const m = memberships.find((x) => x.workspaceId === activeWorkspaceId);
    return m?.role === "admin" || m?.role === "superadmin";
  }, [memberships, activeWorkspaceId]);

  const value = useMemo(
    () => ({
      ready,
      activeWorkspaceId,
      setActiveWorkspaceId,
      memberships,
      sedeIds,
      isWorkspaceAdmin,
      canSwitchWorkspace,
      bootstrapErrorMessage,
      refresh,
      ensureWorkspace,
      reloadSedeIds,
    }),
    [
      ready,
      activeWorkspaceId,
      setActiveWorkspaceId,
      memberships,
      sedeIds,
      isWorkspaceAdmin,
      canSwitchWorkspace,
      bootstrapErrorMessage,
      refresh,
      ensureWorkspace,
      reloadSedeIds,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
