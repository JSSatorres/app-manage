export interface SesionRunnerBlock {
  id: string;
  duracionMinutos: number;
}

export interface SesionRunnerIdentity {
  userId: string;
  workspaceId: string;
  sesionId: string;
  blocksSignature: string;
}

export interface SesionRunnerState extends SesionRunnerIdentity {
  blockIds: string[];
  durationMsByBlockId: Record<string, number>;
  viewedBlockId: string | null;
  activeBlockId: string | null;
  remainingMsByBlockId: Record<string, number>;
  running: boolean;
  startedAtEpochMs: number | null;
  completedBlockIds: string[];
  skippedBlockIds: string[];
  revision: number;
  writerTabId: string;
  updatedAtEpochMs: number;
  lastObservedAtEpochMs: number;
  notice: string | null;
}

export type SesionRunnerAction =
  | { type: "VIEW_BLOCK"; blockId: string }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "SKIP" };

export interface PersistedSesionRunnerV1 {
  version: 1;
  userId: string;
  workspaceId: string;
  sesionId: string;
  blocksSignature: string;
  viewedBlockId: string;
  activeBlockId: string | null;
  remainingMsByBlockId: Record<string, number>;
  running: boolean;
  startedAtEpochMs: number | null;
  completedBlockIds: string[];
  skippedBlockIds: string[];
  revision: number;
  writerTabId: string;
  updatedAtEpochMs: number;
}

export interface HydrateSesionRunnerOptions {
  payload: unknown;
  identity: SesionRunnerIdentity;
  blocks: readonly SesionRunnerBlock[];
  writerTabId: string;
  nowEpochMs: number;
}

export interface HydrateSesionRunnerResult {
  state: SesionRunnerState;
  reason: string | null;
}

export interface SyncSesionRunnerStorageEventOptions {
  current: SesionRunnerState;
  key: string | null;
  newValue: string | null;
  identity: SesionRunnerIdentity;
  blocks: readonly SesionRunnerBlock[];
  nowEpochMs: number;
}

const RUNNER_STORAGE_PREFIX = "sportapp:sesion-runner:v1";
const CLOCK_SKEW_NOTICE = "Se detectó un cambio de reloj. El temporizador se ha pausado.";

function toDurationMs(duracionMinutos: number): number {
  return Math.max(0, Math.trunc(duracionMinutos * 60_000));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidPersistedRunner(value: unknown): value is PersistedSesionRunnerV1 {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.remainingMsByBlockId)) {
    return false;
  }

  return (
    typeof value.userId === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.sesionId === "string" &&
    typeof value.blocksSignature === "string" &&
    typeof value.viewedBlockId === "string" &&
    (typeof value.activeBlockId === "string" || value.activeBlockId === null) &&
    typeof value.running === "boolean" &&
    (typeof value.startedAtEpochMs === "number" || value.startedAtEpochMs === null) &&
    isStringArray(value.completedBlockIds) &&
    isStringArray(value.skippedBlockIds) &&
    typeof value.revision === "number" &&
    typeof value.writerTabId === "string" &&
    typeof value.updatedAtEpochMs === "number"
  );
}

function parsePayload(payload: unknown): unknown {
  if (typeof payload !== "string") {
    return payload;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

function hasBlock(state: SesionRunnerState, blockId: string): boolean {
  return state.blockIds.includes(blockId);
}

function uniqueKnownBlockIds(blockIds: readonly string[], ids: readonly string[]): string[] {
  return [...new Set(ids.filter((id) => blockIds.includes(id)))];
}

function nextBlockId(state: SesionRunnerState, activeBlockId: string): string | null {
  const currentIndex = state.blockIds.indexOf(activeBlockId);
  return state.blockIds[currentIndex + 1] ?? null;
}

function withMutation(
  state: SesionRunnerState,
  changes: Partial<SesionRunnerState>,
  nowEpochMs: number,
): SesionRunnerState {
  return {
    ...state,
    ...changes,
    updatedAtEpochMs: nowEpochMs,
    lastObservedAtEpochMs: Math.max(state.lastObservedAtEpochMs, nowEpochMs),
  };
}

function materializeActive(state: SesionRunnerState, nowEpochMs: number): SesionRunnerState {
  if (!state.running || state.activeBlockId === null || state.startedAtEpochMs === null) {
    return state;
  }

  if (nowEpochMs < state.lastObservedAtEpochMs) {
    return withMutation(
      state,
      {
        running: false,
        startedAtEpochMs: null,
        notice: CLOCK_SKEW_NOTICE,
      },
      state.lastObservedAtEpochMs,
    );
  }

  const remainingMs = getEffectiveRemainingMs(state, nowEpochMs);
  return {
    ...state,
    remainingMsByBlockId: {
      ...state.remainingMsByBlockId,
      [state.activeBlockId]: remainingMs,
    },
    running: false,
    startedAtEpochMs: null,
    lastObservedAtEpochMs: nowEpochMs,
  };
}

function completeActive(state: SesionRunnerState, nowEpochMs: number, skipped: boolean): SesionRunnerState {
  const activeBlockId = state.activeBlockId;
  if (activeBlockId === null) {
    return state;
  }

  const nextActiveBlockId = nextBlockId(state, activeBlockId);
  const completedBlockIds = skipped
    ? state.completedBlockIds
    : uniqueKnownBlockIds(state.blockIds, [...state.completedBlockIds, activeBlockId]);
  const skippedBlockIds = skipped
    ? uniqueKnownBlockIds(state.blockIds, [...state.skippedBlockIds, activeBlockId])
    : state.skippedBlockIds;

  return withMutation(
    state,
    {
      activeBlockId: nextActiveBlockId ?? activeBlockId,
      viewedBlockId: state.viewedBlockId === activeBlockId ? (nextActiveBlockId ?? activeBlockId) : state.viewedBlockId,
      remainingMsByBlockId: { ...state.remainingMsByBlockId, [activeBlockId]: 0 },
      running: false,
      startedAtEpochMs: null,
      completedBlockIds,
      skippedBlockIds,
      notice: null,
    },
    nowEpochMs,
  );
}

function resetBlockForPlay(state: SesionRunnerState, blockId: string): SesionRunnerState {
  if ((state.remainingMsByBlockId[blockId] ?? 0) > 0) {
    return state;
  }

  return {
    ...state,
    remainingMsByBlockId: {
      ...state.remainingMsByBlockId,
      [blockId]: state.durationMsByBlockId[blockId],
    },
    completedBlockIds: state.completedBlockIds.filter((id) => id !== blockId),
    skippedBlockIds: state.skippedBlockIds.filter((id) => id !== blockId),
  };
}

export function getSesionRunnerStorageKey(identity: Pick<SesionRunnerIdentity, "userId" | "workspaceId" | "sesionId">): string {
  return `${RUNNER_STORAGE_PREFIX}:${identity.userId}:${identity.workspaceId}:${identity.sesionId}`;
}

export function createSesionRunnerState({
  identity,
  blocks,
  writerTabId,
  nowEpochMs,
}: {
  identity: SesionRunnerIdentity;
  blocks: readonly SesionRunnerBlock[];
  writerTabId: string;
  nowEpochMs: number;
}): SesionRunnerState {
  const blockIds = blocks.map((block) => block.id);
  const durationMsByBlockId = Object.fromEntries(
    blocks.map((block) => [block.id, toDurationMs(block.duracionMinutos)]),
  );

  return {
    ...identity,
    blockIds,
    durationMsByBlockId,
    viewedBlockId: blockIds[0] ?? null,
    activeBlockId: blockIds[0] ?? null,
    remainingMsByBlockId: { ...durationMsByBlockId },
    running: false,
    startedAtEpochMs: null,
    completedBlockIds: [],
    skippedBlockIds: [],
    revision: 0,
    writerTabId,
    updatedAtEpochMs: nowEpochMs,
    lastObservedAtEpochMs: nowEpochMs,
    notice: null,
  };
}

export function getEffectiveRemainingMs(state: SesionRunnerState, nowEpochMs: number): number {
  const activeBlockId = state.activeBlockId;
  if (!state.running || activeBlockId === null || state.startedAtEpochMs === null) {
    return activeBlockId === null ? 0 : (state.remainingMsByBlockId[activeBlockId] ?? 0);
  }

  const baseRemainingMs = state.remainingMsByBlockId[activeBlockId] ?? 0;
  const elapsedMs = Math.max(0, nowEpochMs - state.startedAtEpochMs);
  return Math.max(0, baseRemainingMs - elapsedMs);
}

export function reduceSesionRunnerState(
  state: SesionRunnerState,
  action: SesionRunnerAction,
  nowEpochMs: number,
): SesionRunnerState {
  if (action.type === "VIEW_BLOCK") {
    return hasBlock(state, action.blockId)
      ? withMutation(state, { viewedBlockId: action.blockId, notice: null }, nowEpochMs)
      : state;
  }

  if (action.type === "PAUSE") {
    if (!state.running) {
      return state;
    }

    const materialized = materializeActive(state, nowEpochMs);
    if (materialized.notice !== null) {
      return materialized;
    }

    return withMutation(materialized, { notice: null }, nowEpochMs);
  }

  if (action.type === "SKIP") {
    if (state.activeBlockId === null) {
      return state;
    }

    const materialized = materializeActive(state, nowEpochMs);
    if (materialized.notice !== null) {
      return materialized;
    }

    return completeActive(materialized, nowEpochMs, true);
  }

  const viewedBlockId = state.viewedBlockId;
  if (viewedBlockId === null || !hasBlock(state, viewedBlockId)) {
    return state;
  }

  const materialized = materializeActive(state, nowEpochMs);
  if (materialized.notice !== null) {
    return materialized;
  }

  const selected = resetBlockForPlay(materialized, viewedBlockId);
  return withMutation(
    selected,
    {
      activeBlockId: viewedBlockId,
      running: true,
      startedAtEpochMs: nowEpochMs,
      notice: null,
    },
    nowEpochMs,
  );
}

export function advanceSesionRunnerState(state: SesionRunnerState, nowEpochMs: number): SesionRunnerState {
  if (!state.running || state.activeBlockId === null || state.startedAtEpochMs === null) {
    return state;
  }

  if (nowEpochMs < state.lastObservedAtEpochMs) {
    return withMutation(
      state,
      { running: false, startedAtEpochMs: null, notice: CLOCK_SKEW_NOTICE },
      state.lastObservedAtEpochMs,
    );
  }

  if (getEffectiveRemainingMs(state, nowEpochMs) > 0) {
    return state;
  }

  const materialized = {
    ...state,
    remainingMsByBlockId: { ...state.remainingMsByBlockId, [state.activeBlockId]: 0 },
    running: false,
    startedAtEpochMs: null,
    lastObservedAtEpochMs: nowEpochMs,
  };
  return completeActive(materialized, nowEpochMs, false);
}

export function serializeSesionRunnerState(state: SesionRunnerState): PersistedSesionRunnerV1 {
  return {
    version: 1,
    userId: state.userId,
    workspaceId: state.workspaceId,
    sesionId: state.sesionId,
    blocksSignature: state.blocksSignature,
    viewedBlockId: state.viewedBlockId ?? "",
    activeBlockId: state.activeBlockId,
    remainingMsByBlockId: { ...state.remainingMsByBlockId },
    running: state.running,
    startedAtEpochMs: state.startedAtEpochMs,
    completedBlockIds: [...state.completedBlockIds],
    skippedBlockIds: [...state.skippedBlockIds],
    revision: state.revision,
    writerTabId: state.writerTabId,
    updatedAtEpochMs: state.updatedAtEpochMs,
  };
}

export function prepareSesionRunnerPersistence(
  state: SesionRunnerState,
  storedPayload: unknown,
  writerTabId: string,
  nowEpochMs: number,
): SesionRunnerState {
  const stored = parsePayload(storedPayload);
  const storedRevision =
    isValidPersistedRunner(stored) &&
    stored.userId === state.userId &&
    stored.workspaceId === state.workspaceId &&
    stored.sesionId === state.sesionId &&
    stored.blocksSignature === state.blocksSignature
      ? stored.revision
      : 0;

  return {
    ...state,
    revision: Math.max(state.revision, storedRevision) + 1,
    writerTabId,
    updatedAtEpochMs: nowEpochMs,
    lastObservedAtEpochMs: Math.max(state.lastObservedAtEpochMs, nowEpochMs),
  };
}

export function hydrateSesionRunnerState(options: HydrateSesionRunnerOptions): HydrateSesionRunnerResult {
  const freshState = createSesionRunnerState(options);
  if (options.payload === null || options.payload === undefined) {
    return { state: freshState, reason: null };
  }
  const payload = parsePayload(options.payload);
  if (isRecord(payload) && payload.version !== 1) {
    return { state: freshState, reason: "La versión del estado guardado no es compatible." };
  }
  if (!isValidPersistedRunner(payload)) {
    return { state: freshState, reason: "El estado guardado no es compatible y se ha reiniciado." };
  }

  if (
    payload.userId !== options.identity.userId ||
    payload.workspaceId !== options.identity.workspaceId ||
    payload.sesionId !== options.identity.sesionId
  ) {
    return { state: freshState, reason: "El estado guardado pertenece a otro usuario, espacio de trabajo o sesión." };
  }

  if (payload.blocksSignature !== options.identity.blocksSignature) {
    return { state: freshState, reason: "La composición de bloques cambió y el cronómetro se ha reiniciado." };
  }

  const validViewedBlockId = freshState.blockIds.includes(payload.viewedBlockId)
    ? payload.viewedBlockId
    : freshState.viewedBlockId;
  const validActiveBlockId = payload.activeBlockId !== null && freshState.blockIds.includes(payload.activeBlockId)
    ? payload.activeBlockId
    : freshState.activeBlockId;
  const remainingMsByBlockId = Object.fromEntries(
    freshState.blockIds.map((blockId) => {
      const savedRemainingMs = payload.remainingMsByBlockId[blockId];
      const durationMs = freshState.durationMsByBlockId[blockId];
      return [blockId, typeof savedRemainingMs === "number" ? Math.max(0, Math.min(savedRemainingMs, durationMs)) : durationMs];
    }),
  );
  const hydrated: SesionRunnerState = {
    ...freshState,
    viewedBlockId: validViewedBlockId,
    activeBlockId: validActiveBlockId,
    remainingMsByBlockId,
    running: payload.running && validActiveBlockId !== null && payload.startedAtEpochMs !== null,
    startedAtEpochMs: payload.running && validActiveBlockId !== null ? payload.startedAtEpochMs : null,
    completedBlockIds: uniqueKnownBlockIds(freshState.blockIds, payload.completedBlockIds),
    skippedBlockIds: uniqueKnownBlockIds(freshState.blockIds, payload.skippedBlockIds),
    revision: Math.max(0, Math.trunc(payload.revision)),
    writerTabId: payload.writerTabId,
    updatedAtEpochMs: payload.updatedAtEpochMs,
    lastObservedAtEpochMs: payload.startedAtEpochMs ?? options.nowEpochMs,
  };

  return { state: advanceSesionRunnerState(hydrated, options.nowEpochMs), reason: null };
}

function comparePersistedRunners(current: PersistedSesionRunnerV1, incoming: PersistedSesionRunnerV1): number {
  if (incoming.revision !== current.revision) {
    return incoming.revision - current.revision;
  }
  if (incoming.updatedAtEpochMs !== current.updatedAtEpochMs) {
    return incoming.updatedAtEpochMs - current.updatedAtEpochMs;
  }
  return incoming.writerTabId.localeCompare(current.writerTabId);
}

export function syncSesionRunnerStorageEvent(
  options: SyncSesionRunnerStorageEventOptions,
): { state: SesionRunnerState; adopted: boolean } {
  if (options.key !== getSesionRunnerStorageKey(options.identity) || options.newValue === null) {
    return { state: options.current, adopted: false };
  }

  const parsed = parsePayload(options.newValue);
  if (!isValidPersistedRunner(parsed)) {
    return { state: options.current, adopted: false };
  }

  const hydrated = hydrateSesionRunnerState({
    payload: parsed,
    identity: options.identity,
    blocks: options.blocks,
    writerTabId: options.current.writerTabId,
    nowEpochMs: options.nowEpochMs,
  });
  if (hydrated.reason !== null || comparePersistedRunners(serializeSesionRunnerState(options.current), parsed) <= 0) {
    return { state: options.current, adopted: false };
  }

  return { state: hydrated.state, adopted: true };
}
