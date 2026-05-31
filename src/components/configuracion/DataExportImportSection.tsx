"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, Link2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildExportBlob,
  buildTemplateBlob,
  downloadBlob,
  fetchFromGoogleUrl,
  importWorkbook,
  readFileAsArrayBuffer,
  type EntityKey,
  type ImportResult,
} from "@/services/import-export";

type Tab = "exportar" | "importar";

const ENTITY_LABELS: Record<EntityKey, string> = {
  sedes: "Sedes",
  equipos: "Equipos",
  entrenadores: "Entrenadores",
  jugadores: "Jugadores",
  ejercicios: "Ejercicios",
  sesiones: "Sesiones",
};

export function DataExportImportSection() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;

  const [tab, setTab] = useState<Tab>("exportar");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [gsheetUrl, setGsheetUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDownloadTemplate() {
    downloadBlob(buildTemplateBlob(), "plantilla-importacion.xlsx");
  }

  async function handleExport() {
    if (!workspaceId) return;
    setError(null);
    setExporting(true);
    try {
      const blob = await buildExportBlob(workspaceId);
      const date = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `export-${date}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  async function runImport(buffer: ArrayBuffer) {
    if (!workspaceId) {
      setError("Selecciona un club (workspace) antes de importar.");
      return;
    }
    setError(null);
    setResult(null);
    setImporting(true);
    try {
      const res = await importWorkbook(buffer, workspaceId);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al importar el archivo");
    } finally {
      setImporting(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await readFileAsArrayBuffer(file);
    await runImport(buffer);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImportFromGoogle() {
    if (!gsheetUrl.trim()) {
      setError("Pega la URL del Google Sheets o del archivo de Google Drive.");
      return;
    }
    setError(null);
    setImporting(true);
    try {
      const buffer = await fetchFromGoogleUrl(gsheetUrl);
      await runImport(buffer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al descargar de Google");
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos (Importar / Exportar)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Exporta todas tus entidades a Excel o impórtalas desde un archivo o Google Sheets.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Tabs */}
        <div className="bg-muted inline-flex w-fit items-center justify-center rounded-lg p-[3px]">
          <button
            type="button"
            onClick={() => setTab("exportar")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "exportar" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Download size={15} /> Exportar
          </button>
          <button
            type="button"
            onClick={() => setTab("importar")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "importar" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Upload size={15} /> Importar
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {tab === "exportar" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Descarga un único Excel con una hoja por entidad (Sedes, Equipos, Entrenadores,
              Jugadores, Ejercicios y Sesiones). Las referencias se escriben por nombre.
            </p>
            <Button onClick={handleExport} disabled={exporting || !workspaceId}>
              <Download size={16} />
              {exporting ? "Exportando..." : "Exportar a Excel"}
            </Button>
            {!workspaceId && (
              <p className="text-xs text-muted-foreground">
                Selecciona un club para poder exportar.
              </p>
            )}
          </div>
        )}

        {tab === "importar" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Sube un Excel con las hojas de cada entidad. Los nombres de las columnas son
                flexibles (acepta sinónimos), y las referencias entre entidades se hacen por
                nombre. Puedes descargar una plantilla con las columnas sugeridas.
              </p>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileSpreadsheet size={15} /> Descargar plantilla
              </Button>
            </div>

            {/* Subir archivo */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Desde un archivo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileChange}
                disabled={importing || !workspaceId}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
              />
            </div>

            {/* Google Sheets / Drive */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Desde Google Sheets o Google Drive</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Link2
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={gsheetUrl}
                    onChange={(e) => setGsheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="pl-9"
                    disabled={importing || !workspaceId}
                  />
                </div>
                <Button onClick={handleImportFromGoogle} disabled={importing || !workspaceId}>
                  <Upload size={16} /> Importar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El documento debe estar compartido como &quot;cualquiera con el enlace&quot;.
              </p>
            </div>

            {importing && (
              <p className="text-sm text-muted-foreground">Importando datos…</p>
            )}

            {result && <ImportResultView result={result} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ImportResultView({ result }: { result: ImportResult }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CheckCircle2 size={16} className="text-emerald-600" />
        {result.totalCreated} registros creados
        {result.totalErrors > 0 && ` · ${result.totalErrors} con error`}
      </div>
      <div className="space-y-2">
        {result.summaries.map((s) => (
          <div key={s.entity} className="text-sm">
            <span className="font-medium">{ENTITY_LABELS[s.entity]}:</span>{" "}
            <span className="text-emerald-700">{s.created} creados</span>
            {s.skipped > 0 && (
              <span className="text-muted-foreground"> · {s.skipped} omitidos</span>
            )}
            {s.errors.length > 0 && (
              <span className="text-destructive"> · {s.errors.length} errores</span>
            )}
            {s.errors.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-destructive">
                {s.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>
                    Fila {err.row}: {err.message}
                  </li>
                ))}
                {s.errors.length > 5 && <li>… y {s.errors.length - 5} más</li>}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
