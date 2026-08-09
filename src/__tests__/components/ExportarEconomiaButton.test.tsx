import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExportarEconomiaButton } from "@/components/economia/ExportarEconomiaButton";
import type { EconomicExportData } from "@/services/economia.service";

const exportData: EconomicExportData = {
  entries: [{
    id: "entry-1", workspaceId: "workspace-1", entryType: "income", categoryId: "category-1", playerId: null,
    concept: "Patrocinio", counterpartyName: "Club local", amountMinor: 5000, currencyCode: "EUR",
    issueDate: "2026-09-01", dueDate: "2026-09-01", scheduleId: null, periodKey: "2026-09", lifecycle: "open",
    cancellationReason: null, cancelledAt: null, cancelledBy: null, createdAt: "2026-08-01", updatedAt: "2026-08-01",
  }],
  movementsByEntry: {},
  totalEntries: 1,
  sourceEntriesCount: 1,
  complete: true,
};

afterEach(() => vi.restoreAllMocks());

describe("ExportarEconomiaButton", () => {
  it("descarga solo el CSV completo que devuelve la acciÃ³n del hook", async () => {
    const onExport = vi.fn().mockResolvedValue(exportData);
    const createObjectURL = vi.fn().mockReturnValue("blob:export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<ExportarEconomiaButton workspaceId="workspace-123456" period="2026-09" loading={false} onExport={onExport} />);
    fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));

    await waitFor(() => expect(onExport).toHaveBeenCalledOnce());
    expect(screen.getByText("Exportadas 1 filas.")).toBeInTheDocument();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
  });

  it("muestra el error controlado y bloquea el disparo durante la exportaciÃ³n", () => {
    render(<ExportarEconomiaButton workspaceId="workspace-123456" loading errorMessage="No se ha podido completar el export." onExport={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido completar el export.");
    expect(screen.getByRole("button", { name: /Preparando exportaciÃ³n/ })).toBeDisabled();
  });
});
