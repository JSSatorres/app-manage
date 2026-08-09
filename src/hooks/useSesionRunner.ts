"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  advanceSesionRunnerState,
  getEffectiveRemainingMs,
  getSesionRunnerStorageKey,
  hydrateSesionRunnerState,
  prepareSesionRunnerPersistence,
  reduceSesionRunnerState,
  serializeSesionRunnerState,
  syncSesionRunnerStorageEvent,
  type SesionRunnerAction,
  type SesionRunnerBlock,
  type SesionRunnerIdentity,
  type SesionRunnerState,
} from "@/lib/sesionRunnerState";
import { useWorkspaceContext } from "@/lib/workspaceContext";

export interface UseSesionRunnerOptions {
  sesionId: string | null;
  blocks: readonly SesionRunnerBlock[];
  blocksSignature: string;
}

export interface UseSesionRunnerResult {
  state: SesionRunnerState | null;
  isHydrated: boolean;
  remainingMs: number;
  view: (blockId: string) => void;
  play: () => void;
  pause: () => void;
  skip: () => void;
  previousPreview: () => void;
  nextPreview: () => void;
}

function createWriterTabId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `runner-${Math.random().toString(36).slice(2)}`;
}

function isSameIdentity(state: SesionRunnerState, identity: SesionRunnerIdentity): boolean {
  return (
    state.userId === identity.userId &&
    state.workspaceId === identity.workspaceId &&
    state.sesionId === identity.sesionId &&
    state.blocksSignature === identity.blocksSignature
  );
}

export function useSesionRunner({ sesionId, blocks, blocksSignature }: UseSesionRunnerOptions): UseSesionRunnerResult {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspaceContext();
  const [writerTabId] = useState(createWriterTabId);
  const [state, setState] = useState<SesionRunnerState | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowEpochMs, setNowEpochMs] = useState(() => Date.now());
  const stateRef = useRef<SesionRunnerState | null>(null);
  const mountedRef = useRef(false);
  const hydrationVersionRef = useRef(0);
  const blockCount = blocks.length;
  const userId = user?.id;

  const identity = useMemo<SesionRunnerIdentity | null>(() => {
    if (!userId || !activeWorkspaceId || !sesionId || !blocksSignature || blockCount === 0) {
      return null;
    }

    return {
      userId,
      workspaceId: activeWorkspaceId,
      sesionId,
      blocksSignature,
    };
  }, [activeWorkspaceId, blockCount, blocksSignature, sesionId, userId]);

  const applyState = useCallback((next: SesionRunnerState) => {
    stateRef.current = next;
    setState(next);
    setNowEpochMs(Date.now());
  }, []);

  const persist = useCallback(
    (next: SesionRunnerState): SesionRunnerState => {
      if (typeof window === "undefined" || !identity) {
        return next;
      }

      try {
        const storageKey = getSesionRunnerStorageKey(identity);
        const prepared = prepareSesionRunnerPersistence(next, window.localStorage.getItem(storageKey), writerTabId, Date.now());
        window.localStorage.setItem(storageKey, JSON.stringify(serializeSesionRunnerState(prepared)));
        return prepared;
      } catch {
        return next;
      }
    },
    [identity, writerTabId],
  );

  const dispatchExplicit = useCallback(
    (action: SesionRunnerAction) => {
      const current = stateRef.current;
      if (!current || !identity || !isSameIdentity(current, identity)) return;

      const next = reduceSesionRunnerState(current, action, Date.now());
      if (next === current) return;
      applyState(persist(next));
    },
    [applyState, identity, persist],
  );

  const materializeTime = useCallback(() => {
    const current = stateRef.current;
    if (!current || !identity || !isSameIdentity(current, identity)) return;

    const next = advanceSesionRunnerState(current, Date.now());
    if (next !== current) {
      applyState(persist(next));
      return;
    }
    if (mountedRef.current) setNowEpochMs(Date.now());
  }, [applyState, identity, persist]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const hydrationVersion = hydrationVersionRef.current + 1;
    hydrationVersionRef.current = hydrationVersion;

    if (!identity || typeof window === "undefined") {
      stateRef.current = null;
      queueMicrotask(() => {
        if (mountedRef.current && hydrationVersionRef.current === hydrationVersion) {
          setState(null);
          setIsHydrated(false);
        }
      });
      return;
    }

    if (stateRef.current && isSameIdentity(stateRef.current, identity)) {
      return;
    }

    const storageKey = getSesionRunnerStorageKey(identity);
    let hydrated = hydrateSesionRunnerState({
      payload: window.localStorage.getItem(storageKey),
      identity,
      blocks,
      writerTabId,
      nowEpochMs: Date.now(),
    });
    if (hydrated.reason !== null) hydrated = { ...hydrated, state: { ...hydrated.state, notice: hydrated.reason } };
    stateRef.current = hydrated.state;

    queueMicrotask(() => {
      if (mountedRef.current && hydrationVersionRef.current === hydrationVersion && stateRef.current === hydrated.state) {
        setState(hydrated.state);
        setNowEpochMs(Date.now());
        setIsHydrated(true);
      }
    });
  }, [blocks, identity, writerTabId]);

  useEffect(() => {
    if (!state?.running) return;
    const timer = window.setInterval(materializeTime, 250);
    return () => window.clearInterval(timer);
  }, [materializeTime, state?.running]);

  useEffect(() => {
    if (!identity) return;

    const handleStorage = (event: StorageEvent) => {
      const current = stateRef.current;
      if (!current) return;
      const synced = syncSesionRunnerStorageEvent({
        current,
        key: event.key,
        newValue: event.newValue,
        identity,
        blocks,
        nowEpochMs: Date.now(),
      });
      if (synced.adopted) applyState(synced.state);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") materializeTime();
    };

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [applyState, blocks, identity, materializeTime]);

  const view = useCallback((blockId: string) => dispatchExplicit({ type: "VIEW_BLOCK", blockId }), [dispatchExplicit]);
  const play = useCallback(() => dispatchExplicit({ type: "PLAY" }), [dispatchExplicit]);
  const pause = useCallback(() => dispatchExplicit({ type: "PAUSE" }), [dispatchExplicit]);
  const skip = useCallback(() => dispatchExplicit({ type: "SKIP" }), [dispatchExplicit]);
  const previousPreview = useCallback(() => {
    const current = stateRef.current;
    const index = current?.viewedBlockId ? current.blockIds.indexOf(current.viewedBlockId) : -1;
    const previousBlockId = index > 0 ? current?.blockIds[index - 1] : null;
    if (previousBlockId) view(previousBlockId);
  }, [view]);
  const nextPreview = useCallback(() => {
    const current = stateRef.current;
    const index = current?.viewedBlockId ? current.blockIds.indexOf(current.viewedBlockId) : -1;
    const nextBlockId = index >= 0 ? current?.blockIds[index + 1] : null;
    if (nextBlockId) view(nextBlockId);
  }, [view]);

  return {
    state,
    isHydrated,
    remainingMs: state ? getEffectiveRemainingMs(state, nowEpochMs) : 0,
    view,
    play,
    pause,
    skip,
    previousPreview,
    nextPreview,
  };
}
