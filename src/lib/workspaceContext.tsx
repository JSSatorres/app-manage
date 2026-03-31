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
import { supabase } from "@/services/supabase";

const STORAGE_KEY = "sportapp_active_workspace_id";

export interface WorkspaceMembership {
  workspaceId: string;
  name: string;
  role: "admin" | "member";
}

interface WorkspaceContextValue {
  ready: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  memberships: WorkspaceMembership[];
  sedeIds: string[];
  isWorkspaceAdmin: boolean;
  refresh: () => Promise<void>;
  reloadSedeIds: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

async function bootstrapWorkspaces(session: Session) {
  const meta = session.user.user_metadata as {
    full_name?: string;
    name?: string;
  };
  await supabase.rpc("sync_auth_profile", {
    p_full_name: meta?.full_name ?? meta?.name ?? null,
  });
  await supabase.rpc("setup_user_workspaces");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name)")
    .eq("user_id", session.user.id);

  if (error || !data) return { list: [] as WorkspaceMembership[], nextId: null as string | null };

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
      role: row.role === "admin" ? "admin" : "member",
    });
  }

  let nextId: string | null = null;
  if (typeof window !== "undefined") {
    nextId = window.localStorage.getItem(STORAGE_KEY);
  }
  if (!nextId || !list.some((m) => m.workspaceId === nextId)) {
    nextId = list[0]?.workspaceId ?? null;
  }
  return { list, nextId };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [memberships, setMemberships] = useState<WorkspaceMembership[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(
    null,
  );
  const [sedeIds, setSedeIds] = useState<string[]>([]);

  const loadSedeIds = useCallback(async (workspaceId: string) => {
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
    const { data: sdata } = await supabase.auth.getSession();
    const s = sdata.session;
    if (!s?.user?.id) return;
    const { list, nextId } = await bootstrapWorkspaces(s);
    setMemberships(list);
    setActiveWorkspaceIdState(nextId);
    if (nextId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextId);
      await loadSedeIds(nextId);
    } else {
      setSedeIds([]);
    }
    setReady(true);
  }, [loadSedeIds]);

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
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: sdata } = await supabase.auth.getSession();
      const s = sdata.session;
      if (!s?.user?.id || cancelled) return;
      const { list, nextId } = await bootstrapWorkspaces(s);
      if (cancelled) return;
      setMemberships(list);
      setActiveWorkspaceIdState(nextId);
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

  const setActiveWorkspaceId = useCallback(
    (id: string | null) => {
      setActiveWorkspaceIdState(id);
      if (typeof window !== "undefined") {
        if (id) window.localStorage.setItem(STORAGE_KEY, id);
        else window.localStorage.removeItem(STORAGE_KEY);
      }
      if (id) void loadSedeIds(id);
      else setSedeIds([]);
    },
    [loadSedeIds],
  );

  const isWorkspaceAdmin = useMemo(() => {
    const m = memberships.find((x) => x.workspaceId === activeWorkspaceId);
    return m?.role === "admin";
  }, [memberships, activeWorkspaceId]);

  const value = useMemo(
    () => ({
      ready,
      activeWorkspaceId,
      setActiveWorkspaceId,
      memberships,
      sedeIds,
      isWorkspaceAdmin,
      refresh,
      reloadSedeIds,
    }),
    [
      ready,
      activeWorkspaceId,
      setActiveWorkspaceId,
      memberships,
      sedeIds,
      isWorkspaceAdmin,
      refresh,
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
