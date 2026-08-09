import { afterEach, describe, expect, it, vi } from "vitest";

import {
  advanceSesionRunnerState,
  createSesionRunnerState,
  getEffectiveRemainingMs,
  getSesionRunnerStorageKey,
  hydrateSesionRunnerState,
  prepareSesionRunnerPersistence,
  reduceSesionRunnerState,
  serializeSesionRunnerState,
  syncSesionRunnerStorageEvent,
  type SesionRunnerBlock,
  type SesionRunnerIdentity,
} from "@/lib/sesionRunnerState";

const blocks: readonly SesionRunnerBlock[] = [
  { id: "bloque-1", duracionMinutos: 10 },
  { id: "bloque-2", duracionMinutos: 20 },
  { id: "bloque-3", duracionMinutos: 5 },
];

const identity: SesionRunnerIdentity = {
  userId: "usuario-1",
  workspaceId: "workspace-1",
  sesionId: "sesion-1",
  blocksSignature: "firma-1",
};

function createState(nowEpochMs = 1_000) {
  return createSesionRunnerState({
    identity,
    blocks,
    writerTabId: "pestana-a",
    nowEpochMs,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sesionRunnerState", () => {
  it("prepara el primer bloque, lo previsualiza y conserva todos los tiempos completos", () => {
    const state = createState();

    expect(state.activeBlockId).toBe("bloque-1");
    expect(state.viewedBlockId).toBe("bloque-1");
    expect(state.remainingMsByBlockId).toEqual({
      "bloque-1": 600_000,
      "bloque-2": 1_200_000,
      "bloque-3": 300_000,
    });
    expect(state.running).toBe(false);
    expect(state.startedAtEpochMs).toBeNull();
  });

  it("previsualiza otro bloque sin alterar el cronómetro", () => {
    const started = reduceSesionRunnerState(createState(), { type: "PLAY" }, 2_000);
    const preview = reduceSesionRunnerState(started, { type: "VIEW_BLOCK", blockId: "bloque-3" }, 3_000);

    expect(preview.viewedBlockId).toBe("bloque-3");
    expect(preview.activeBlockId).toBe("bloque-1");
    expect(preview.running).toBe(true);
    expect(preview.startedAtEpochMs).toBe(2_000);
    expect(preview.remainingMsByBlockId).toEqual(started.remainingMsByBlockId);
  });

  it("inicia solo el visto, pausa materializando y al cambiar congela el anterior", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const running = reduceSesionRunnerState(createState(Date.now()), { type: "PLAY" }, Date.now());
    vi.advanceTimersByTime(60_000);
    const paused = reduceSesionRunnerState(running, { type: "PAUSE" }, Date.now());
    vi.advanceTimersByTime(1_000);
    const preview = reduceSesionRunnerState(paused, { type: "VIEW_BLOCK", blockId: "bloque-2" }, Date.now());
    vi.advanceTimersByTime(1_000);
    const switched = reduceSesionRunnerState(preview, { type: "PLAY" }, Date.now());

    expect(paused.remainingMsByBlockId["bloque-1"]).toBe(540_000);
    expect(paused.running).toBe(false);
    expect(switched.activeBlockId).toBe("bloque-2");
    expect(switched.running).toBe(true);
    expect(switched.remainingMsByBlockId["bloque-1"]).toBe(540_000);
  });

  it("agota como máximo el activo, prepara el siguiente parado y solo mueve la vista si coincidía", () => {
    const running = reduceSesionRunnerState(createState(), { type: "PLAY" }, 0);
    const exhausted = advanceSesionRunnerState(running, 600_000);

    expect(exhausted.remainingMsByBlockId["bloque-1"]).toBe(0);
    expect(exhausted.completedBlockIds).toEqual(["bloque-1"]);
    expect(exhausted.activeBlockId).toBe("bloque-2");
    expect(exhausted.viewedBlockId).toBe("bloque-2");
    expect(exhausted.running).toBe(false);

    const preview = reduceSesionRunnerState(createState(), { type: "VIEW_BLOCK", blockId: "bloque-3" }, 0);
    const notViewed = advanceSesionRunnerState(reduceSesionRunnerState(preview, { type: "PLAY" }, 0), 600_000);
    expect(notViewed.viewedBlockId).toBe("bloque-3");

    const last = createSesionRunnerState({
      identity,
      blocks: [{ id: "ultimo", duracionMinutos: 1 }],
      writerTabId: "pestana-a",
      nowEpochMs: 0,
    });
    const completed = advanceSesionRunnerState(reduceSesionRunnerState(last, { type: "PLAY" }, 0), 60_000);
    expect(completed.activeBlockId).toBe("ultimo");
    expect(completed.running).toBe(false);
    expect(completed.completedBlockIds).toEqual(["ultimo"]);
  });

  it("salta y reinicia un bloque agotado al volver a reproducirlo", () => {
    const skipped = reduceSesionRunnerState(
      reduceSesionRunnerState(createState(0), { type: "PLAY" }, 0),
      { type: "SKIP" },
      1,
    );
    expect(skipped.remainingMsByBlockId["bloque-1"]).toBe(0);
    expect(skipped.skippedBlockIds).toEqual(["bloque-1"]);
    expect(skipped.completedBlockIds).toEqual([]);
    expect(skipped.activeBlockId).toBe("bloque-2");
    expect(skipped.running).toBe(false);

    const revisited = reduceSesionRunnerState(
      reduceSesionRunnerState(skipped, { type: "VIEW_BLOCK", blockId: "bloque-1" }, 2),
      { type: "PLAY" },
      3,
    );
    expect(revisited.activeBlockId).toBe("bloque-1");
    expect(revisited.remainingMsByBlockId["bloque-1"]).toBe(600_000);
    expect(revisited.running).toBe(true);
  });

  it("serializa con clave aislada e hidrata descontando el tiempo real sin URLs", () => {
    const state = reduceSesionRunnerState(createState(1_000), { type: "PLAY" }, 1_000);
    const payload = serializeSesionRunnerState(state);
    const hydrated = hydrateSesionRunnerState({
      payload,
      identity,
      blocks,
      writerTabId: "pestana-b",
      nowEpochMs: 61_000,
    });

    expect(getSesionRunnerStorageKey(identity)).toBe(
      "sportapp:sesion-runner:v1:usuario-1:workspace-1:sesion-1",
    );
    expect(JSON.stringify(payload)).not.toContain("url");
    expect(hydrated.reason).toBeNull();
    expect(getEffectiveRemainingMs(hydrated.state, 61_000)).toBe(540_000);
  });

  it("inicializa sin aviso cuando no hay estado persistido", () => {
    const hydrated = hydrateSesionRunnerState({
      payload: null,
      identity,
      blocks,
      writerTabId: "pestana-b",
      nowEpochMs: 1_000,
    });

    expect(hydrated.reason).toBeNull();
    expect(hydrated.state.notice).toBeNull();
  });

  it("invalida versión, identidad y firma con un motivo español", () => {
    const payload = serializeSesionRunnerState(createState());
    const invalidVersion = hydrateSesionRunnerState({
      payload: { ...payload, version: 2 },
      identity,
      blocks,
      writerTabId: "pestana-b",
      nowEpochMs: 1_000,
    });
    const invalidSignature = hydrateSesionRunnerState({
      payload: { ...payload, blocksSignature: "firma-antigua" },
      identity,
      blocks,
      writerTabId: "pestana-b",
      nowEpochMs: 1_000,
    });
    const invalidIdentity = hydrateSesionRunnerState({
      payload: { ...payload, userId: "usuario-ajeno" },
      identity,
      blocks,
      writerTabId: "pestana-b",
      nowEpochMs: 1_000,
    });

    expect(invalidVersion.state).toEqual(
      createSesionRunnerState({ identity, blocks, writerTabId: "pestana-b", nowEpochMs: 1_000 }),
    );
    expect(invalidVersion.reason).toMatch(/versión/i);
    expect(invalidSignature.reason).toMatch(/composición/i);
    expect(invalidIdentity.reason).toMatch(/otro usuario/i);
  });

  it("no aumenta el tiempo con clock skew y pausa con aviso; un salto adelante no inicia el siguiente", () => {
    const running = reduceSesionRunnerState(createState(1_000), { type: "PLAY" }, 1_000);
    const skewed = advanceSesionRunnerState(running, 500);
    expect(skewed.running).toBe(false);
    expect(skewed.remainingMsByBlockId["bloque-1"]).toBe(600_000);
    expect(skewed.notice).toMatch(/reloj/i);

    const farAhead = advanceSesionRunnerState(running, 9_999_999);
    expect(farAhead.activeBlockId).toBe("bloque-2");
    expect(farAhead.running).toBe(false);
  });

  it("adopta únicamente el evento de almacenamiento ganador para la misma clave e identidad", () => {
    const current = reduceSesionRunnerState(createState(), { type: "VIEW_BLOCK", blockId: "bloque-2" }, 10);
    const newer = {
      ...serializeSesionRunnerState(current),
      revision: current.revision + 1,
      updatedAtEpochMs: 20,
      writerTabId: "pestana-b",
      viewedBlockId: "bloque-3",
    };
    const adopted = syncSesionRunnerStorageEvent({
      current,
      key: getSesionRunnerStorageKey(identity),
      newValue: JSON.stringify(newer),
      identity,
      blocks,
      nowEpochMs: 20,
    });
    const tieLoser = syncSesionRunnerStorageEvent({
      current: adopted.state,
      key: getSesionRunnerStorageKey(identity),
      newValue: JSON.stringify({ ...newer, updatedAtEpochMs: 20, writerTabId: "pestana-a" }),
      identity,
      blocks,
      nowEpochMs: 20,
    });
    const newerTimestamp = syncSesionRunnerStorageEvent({
      current: adopted.state,
      key: getSesionRunnerStorageKey(identity),
      newValue: JSON.stringify({ ...newer, updatedAtEpochMs: 21, writerTabId: "pestana-a" }),
      identity,
      blocks,
      nowEpochMs: 21,
    });
    const tieWinner = syncSesionRunnerStorageEvent({
      current: newerTimestamp.state,
      key: getSesionRunnerStorageKey(identity),
      newValue: JSON.stringify({ ...newer, updatedAtEpochMs: 21, writerTabId: "pestana-z" }),
      identity,
      blocks,
      nowEpochMs: 21,
    });
    const foreign = syncSesionRunnerStorageEvent({
      current,
      key: "sportapp:sesion-runner:v1:otro:workspace-1:sesion-1",
      newValue: JSON.stringify(newer),
      identity,
      blocks,
      nowEpochMs: 20,
    });

    expect(adopted.adopted).toBe(true);
    expect(adopted.state.viewedBlockId).toBe("bloque-3");
    expect(tieLoser.adopted).toBe(false);
    expect(newerTimestamp.adopted).toBe(true);
    expect(tieWinner.adopted).toBe(true);
    expect(foreign.adopted).toBe(false);
  });

  it("prepara una única escritura con la revisión almacenada más reciente", () => {
    const stored = { ...serializeSesionRunnerState(createState()), revision: 8 };
    const prepared = prepareSesionRunnerPersistence(
      reduceSesionRunnerState(createState(), { type: "VIEW_BLOCK", blockId: "bloque-2" }, 20),
      JSON.stringify(stored),
      "pestana-a",
      20,
    );

    expect(prepared.revision).toBe(9);
    expect(prepared.updatedAtEpochMs).toBe(20);
    expect(prepared.writerTabId).toBe("pestana-a");
  });
});
