import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataExportImportSection } from "@/components/configuracion/DataExportImportSection";
import {
  fetchFromGoogleUrl,
  importWorkbook,
  readFileAsArrayBuffer,
} from "@/services/import-export";

const WORKSPACE_ID = "44444444-4444-4444-8444-444444444444";

const { pendingMock, runMock, workspaceMock } = vi.hoisted(() => ({
  pendingMock: { value: false },
  runMock: vi.fn(),
  workspaceMock: { activeWorkspace: { id: "44444444-4444-4444-8444-444444444444" } },
}));

vi.mock("@/providers/request-lock-provider", () => ({
  useRequestLock: () => ({ pending: pendingMock.value, run: runMock }),
}));

vi.mock("@/lib/workspaceContext", () => ({
  useWorkspaceContext: () => workspaceMock,
}));

vi.mock("@/services/import-export", () => ({
  buildExportBlob: vi.fn(),
  buildTemplateBlob: vi.fn(),
  downloadBlob: vi.fn(),
  fetchFromGoogleUrl: vi.fn(),
  importWorkbook: vi.fn(),
  readFileAsArrayBuffer: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("DataExportImportSection", () => {
  beforeEach(() => {
    pendingMock.value = false;
    runMock.mockReset();
    runMock.mockImplementation((operation: () => Promise<unknown>) => operation());
    vi.mocked(readFileAsArrayBuffer).mockReset();
    vi.mocked(fetchFromGoogleUrl).mockReset();
    vi.mocked(importWorkbook).mockReset();
  });

  it("importa un archivo local una sola vez y conserva el lock hasta persistirlo", async () => {
    const fileRead = deferred<ArrayBuffer>();
    const workbookImport = deferred<{ summaries: []; totalCreated: number; totalErrors: number }>();
    vi.mocked(readFileAsArrayBuffer).mockReturnValue(fileRead.promise);
    vi.mocked(importWorkbook).mockReturnValue(workbookImport.promise);
    const { container } = render(<DataExportImportSection />);

    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    const fileInput = container.querySelector('input[type="file"]');
    if (!fileInput) throw new Error("No se encontró el selector de archivo");
    const file = new File(["xlsx"], "datos.xlsx");

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(readFileAsArrayBuffer).toHaveBeenCalledTimes(1);
    expect(runMock).not.toHaveBeenCalled();

    fileRead.resolve(new ArrayBuffer(8));
    await waitFor(() => expect(importWorkbook).toHaveBeenCalledWith(expect.any(ArrayBuffer), WORKSPACE_ID));
    expect(runMock).toHaveBeenCalledTimes(1);

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(readFileAsArrayBuffer).toHaveBeenCalledTimes(1);

    workbookImport.resolve({ summaries: [], totalCreated: 0, totalErrors: 0 });
    await waitFor(() => expect(fileInput).not.toBeDisabled());
  });

  it("mantiene la descarga de Google y la importación en una única frontera lock", async () => {
    const googleFetch = deferred<ArrayBuffer>();
    const workbookImport = deferred<{ summaries: []; totalCreated: number; totalErrors: number }>();
    vi.mocked(fetchFromGoogleUrl).mockReturnValue(googleFetch.promise);
    vi.mocked(importWorkbook).mockReturnValue(workbookImport.promise);
    render(<DataExportImportSection />);

    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    fireEvent.change(screen.getByPlaceholderText(/docs\.google\.com/i), {
      target: { value: "https://docs.google.com/spreadsheets/d/archivo" },
    });
    const importButton = screen.getAllByRole("button", { name: /^importar$/i })[1];
    fireEvent.click(importButton);
    fireEvent.click(importButton);

    expect(fetchFromGoogleUrl).toHaveBeenCalledTimes(1);
    expect(importWorkbook).not.toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledTimes(1);

    googleFetch.resolve(new ArrayBuffer(8));
    await waitFor(() => expect(importWorkbook).toHaveBeenCalledTimes(1));
    fireEvent.click(importButton);
    expect(fetchFromGoogleUrl).toHaveBeenCalledTimes(1);

    workbookImport.resolve({ summaries: [], totalCreated: 0, totalErrors: 0 });
    await waitFor(() => expect(importButton).not.toBeDisabled());
  });

  it("conserva el error de importación local", async () => {
    vi.mocked(readFileAsArrayBuffer).mockResolvedValue(new ArrayBuffer(8));
    vi.mocked(importWorkbook).mockRejectedValue(new Error("El Excel no es válido"));
    const { container } = render(<DataExportImportSection />);

    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    const fileInput = container.querySelector('input[type="file"]');
    if (!fileInput) throw new Error("No se encontró el selector de archivo");
    fireEvent.change(fileInput, { target: { files: [new File(["xlsx"], "datos.xlsx")] } });

    expect(await screen.findByText("El Excel no es válido")).toBeInTheDocument();
  });
});
