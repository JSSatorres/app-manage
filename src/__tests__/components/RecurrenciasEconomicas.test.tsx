import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecurrenciasEconomicas } from "@/components/economia/RecurrenciasEconomicas";
import type { EconomicCategory, EconomicEntry, EconomicSchedule } from "@/types/economia";

const categoria: EconomicCategory = {
  id: "categoria-1", workspaceId: "workspace-1", direction: "income", code: "CUOTAS",
  name: "Cuotas", isPredefined: true, isActive: true, createdAt: "", updatedAt: "",
};
const recurrencia: EconomicSchedule = {
  id: "recurrencia-1", workspaceId: "workspace-1", entryType: "income", categoryId: categoria.id,
  concept: "Cuota social", counterpartyName: null, playerId: null, amountMinor: 2500, currencyCode: "EUR",
  frequency: "monthly", nextDueDate: "2026-09-15", endDate: null, status: "active", createdAt: "", updatedAt: "",
};
const entradaGenerada: EconomicEntry = {
  id: "entrada-1", workspaceId: "workspace-1", entryType: "income", categoryId: categoria.id,
  playerId: null, concept: "Cuota social", counterpartyName: null, amountMinor: 2500, currencyCode: "EUR",
  issueDate: "2026-09-15", dueDate: "2026-09-15", scheduleId: recurrencia.id, periodKey: "2026-09-15",
  lifecycle: "open", cancellationReason: null, cancelledAt: null, cancelledBy: null, createdAt: "", updatedAt: "",
};

describe("RecurrenciasEconomicas", () => {
  it("muestra la próxima fecha prevista y permite pausar y reactivar una periodicidad", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <RecurrenciasEconomicas
        recurrencias={[recurrencia]}
        categorias={[categoria]}
        currencyCode="EUR"
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText("Próxima generación: 15/09/2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pausar Cuota social" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("recurrencia-1", { status: "paused" }));

    render(
      <RecurrenciasEconomicas
        recurrencias={[{ ...recurrencia, status: "paused" }]}
        categorias={[categoria]}
        currencyCode="EUR"
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onGenerate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reactivar Cuota social" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith("recurrencia-1", { status: "active" }));
  });

  it("previsualiza la siguiente fecha y bloquea el doble clic al generar la siguiente entrada", async () => {
    const onGenerate = vi.fn().mockResolvedValue(entradaGenerada);
    render(
      <RecurrenciasEconomicas
        recurrencias={[recurrencia]}
        categorias={[categoria]}
        currencyCode="EUR"
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nueva periodicidad" }));
    fireEvent.change(screen.getByLabelText("Frecuencia"), { target: { value: "yearly" } });
    fireEvent.change(screen.getByLabelText("Próximo vencimiento"), { target: { value: "2026-09-15" } });
    expect(screen.getByText("Siguiente fecha prevista: 15/09/2027")).toBeInTheDocument();

    const generateButton = screen.getByRole("button", { name: "Generar siguiente Cuota social" });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);
    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("link", { name: "Ver entrada generada" })).toHaveAttribute("href", "#entrada-entrada-1");
  });
});
