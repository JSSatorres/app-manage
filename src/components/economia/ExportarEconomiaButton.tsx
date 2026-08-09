"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildEconomicCsv, buildEconomicCsvFilename } from "@/lib/economiaCsv";
import type { EconomicExportData } from "@/services/economia.service";

interface ExportarEconomiaButtonProps {
  workspaceId: string;
  period?: string;
  loading: boolean;
  errorMessage?: string | null;
  onExport: () => Promise<EconomicExportData | null>;
}

export function ExportarEconomiaButton({
  workspaceId,
  period,
  loading,
  errorMessage,
  onExport,
}: ExportarEconomiaButtonProps) {
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  async function handleExport() {
    const exportData = await onExport();
    if (!exportData?.complete) return;

    const blob = new Blob([buildEconomicCsv(exportData.entries, exportData.movementsByEntry)], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = buildEconomicCsvFilename({ period, workspaceId });
    link.click();
    URL.revokeObjectURL(objectUrl);
    setExportedCount(exportData.totalEntries);
  }

  return (
    <div className="grid gap-1">
      <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={loading}>
        {loading ? "Preparando exportaciÃ³nâ€¦" : "Exportar CSV"}
      </Button>
      {exportedCount !== null && <p className="text-sm text-muted-foreground">Exportadas {exportedCount} filas.</p>}
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
