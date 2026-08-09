import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSesionRunnerState,
  getSesionRunnerStorageKey,
  reduceSesionRunnerState,
  serializeSesionRunnerState,
  type SesionRunnerBlock,
  type SesionRunnerIdentity,
} from "@/lib/sesionRunnerState";

const authMocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

const workspaceMocks = vi.hoisted(() => ({
  useWorkspaceContext: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => authMocks);
vi.mock("@/lib/workspaceContext", () => workspaceMocks);

const blocks: readonly SesionRunnerBlock[] = [
  { id: "bloque-1", duracionMinutos: 10 },
  { id: "bloque-2", duracionMinutos: 5 },
];

const identity: SesionRunnerIdentity = {
  userId: "usuario-1",
  workspaceId: "workspace-1",
  sesionId: "sesion-1",
  blocksSignature: "firma-bloques-1",
};

const options = {
  sesionId: identity.sesionId,
  blocks,
  blocksSignature: identity.blocksSignature,
};

describe("useSesionRunner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    window.localStorage.clear();
    authMocks.useAuth.mockReturnValue({ loading: false, session: null, user: { id: identity.userId } });
    workspaceMocks.useWorkspaceContext.mockReturnValue({ activeWorkspaceId: identity.workspaceId });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("no accede al almacenamiento durante el render SSR e hidrata el estado scoped con tiempo real", async () => {
    const initial = createSesionRunnerState({ identity, blocks, writerTabId: "otra-pestana", nowEpochMs: 0 });
    const running = reduceSesionRunnerState(initial, { type: "PLAY" }, 0);
    window.localStorage.setItem(getSesionRunnerStorageKey(identity), JSON.stringify(serializeSesionRunnerState(running)));
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");

    function RunnerRender() {
      useSesionRunner(options);
      return null;
    }

    renderToString(<RunnerRender />);
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockClear();

    const { result } = renderHook(() => useSesionRunner(options));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.state?.running).toBe(true);
    expect(result.current.remainingMs).toBe(599_000);
  });

  it("repinta el restante y persiste una sola transición al agotar el bloque", async () => {
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");
    const initial = createSesionRunnerState({ identity, blocks, writerTabId: "otra-pestana", nowEpochMs: 0 });
    const running = reduceSesionRunnerState(initial, { type: "PLAY" }, 0);
    const storageKey = getSesionRunnerStorageKey(identity);
    window.localStorage.setItem(storageKey, JSON.stringify(serializeSesionRunnerState(running)));
    const { result } = renderHook(() => useSesionRunner(options));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.state?.running).toBe(true);
    const beforeTick = window.localStorage.getItem(storageKey);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.remainingMs).toBe(598_000);
    expect(window.localStorage.getItem(storageKey)).toBe(beforeTick);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(599_000);
    });
    expect(result.current.state).toMatchObject({
      activeBlockId: "bloque-2",
      running: false,
    });
    expect(window.localStorage.getItem(storageKey)).not.toBe(beforeTick);
  });

  it("expone acciones de ejecución y previsualización con una escritura por transición", async () => {
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");
    const storageKey = getSesionRunnerStorageKey(identity);
    const { result } = renderHook(() => useSesionRunner(options));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => result.current.nextPreview());
    expect(result.current.state?.viewedBlockId).toBe("bloque-2");
    const afterNextPreview = window.localStorage.getItem(storageKey);
    expect(afterNextPreview).not.toBeNull();

    act(() => result.current.previousPreview());
    expect(result.current.state?.viewedBlockId).toBe("bloque-1");
    expect(window.localStorage.getItem(storageKey)).not.toBe(afterNextPreview);

    act(() => result.current.play());
    expect(result.current.state?.running).toBe(true);
    const afterPlay = window.localStorage.getItem(storageKey);

    act(() => result.current.pause());
    expect(result.current.state?.running).toBe(false);
    expect(window.localStorage.getItem(storageKey)).not.toBe(afterPlay);

    act(() => result.current.skip());
    expect(result.current.state?.activeBlockId).toBe("bloque-2");
    expect(window.localStorage.getItem(storageKey)).not.toBe(afterPlay);
  });

  it("salta el bloque preparado y persiste el siguiente como activo detenido", async () => {
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");
    const storageKey = getSesionRunnerStorageKey(identity);
    const { result } = renderHook(() => useSesionRunner(options));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => result.current.skip());

    expect(result.current.state).toMatchObject({
      activeBlockId: "bloque-2",
      viewedBlockId: "bloque-2",
      running: false,
      startedAtEpochMs: null,
      skippedBlockIds: ["bloque-1"],
    });
    expect(result.current.remainingMs).toBe(300_000);
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? "{} ")).toMatchObject({
      activeBlockId: "bloque-2",
      running: false,
      startedAtEpochMs: null,
      skippedBlockIds: ["bloque-1"],
    });
  });

  it("adopta la revisión ganadora de otra pestaña e ignora otra clave", async () => {
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");
    const { result } = renderHook(() => useSesionRunner(options));
    const incoming = {
      ...serializeSesionRunnerState(
        reduceSesionRunnerState(
          createSesionRunnerState({ identity, blocks, writerTabId: "pestana-remota", nowEpochMs: 1_000 }),
          { type: "VIEW_BLOCK", blockId: "bloque-2" },
          1_000,
        ),
      ),
      activeBlockId: "bloque-2",
      remainingMsByBlockId: { "bloque-1": 600_000, "bloque-2": 120_000 },
      revision: 3,
      updatedAtEpochMs: 2_000,
    };

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: getSesionRunnerStorageKey(identity),
          newValue: JSON.stringify(incoming),
        }),
      );
    });
    expect(result.current.state).toMatchObject({
      activeBlockId: "bloque-2",
      viewedBlockId: "bloque-2",
      remainingMsByBlockId: { "bloque-2": 120_000 },
      revision: 3,
    });

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "sportapp:sesion-runner:v1:otro", newValue: JSON.stringify(incoming) }));
    });
    expect(result.current.state?.revision).toBe(3);
  });

  it("materializa el tiempo al volver visible y desmonta el reloj y listeners", async () => {
    const { useSesionRunner } = await import("@/hooks/useSesionRunner");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");
    const initial = createSesionRunnerState({ identity, blocks, writerTabId: "otra-pestana", nowEpochMs: 0 });
    const running = reduceSesionRunnerState(initial, { type: "PLAY" }, 0);
    window.localStorage.setItem(getSesionRunnerStorageKey(identity), JSON.stringify(serializeSesionRunnerState(running)));
    const { result, unmount } = renderHook(() => useSesionRunner(options));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    vi.setSystemTime(601_000);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.state).toMatchObject({ activeBlockId: "bloque-2", running: false });

    unmount();
    expect(removeWindowListener).toHaveBeenCalledWith("storage", expect.any(Function));
    expect(removeDocumentListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: getSesionRunnerStorageKey(identity), newValue: null })));
  });
});
