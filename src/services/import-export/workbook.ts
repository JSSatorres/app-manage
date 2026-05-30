import * as XLSX from "xlsx";
import {
  buildHeaderMap,
  ENTITY_SCHEMAS,
  normalizeHeader,
  type EntityKey,
  type FieldSchema,
} from "./schema";

/** Una fila importada: fieldKey -> valor ya parseado. */
export type ParsedRow = Record<string, string | number | string[] | null>;

export interface ParsedSheet {
  entity: EntityKey;
  rows: ParsedRow[];
}

/** Convierte un número de serie de Excel (días desde 1899-12-30) a Date UTC. */
function excelSerialToDate(serial: number): Date {
  const utcDays = Math.floor(serial - 25569);
  const utcSeconds = utcDays * 86400;
  const date = new Date(utcSeconds * 1000);
  const fractional = serial - Math.floor(serial);
  if (fractional > 0) {
    const totalSeconds = Math.round(86400 * fractional);
    date.setUTCSeconds(date.getUTCSeconds() + totalSeconds);
  }
  return date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parsea un valor de celda a fecha ISO `YYYY-MM-DD`, o null. */
export function parseDateValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    const d = excelSerialToDate(value);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const str = String(value).trim();
  // ISO ya válido
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/yyyy o dd-mm-yyyy
  const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const day = pad(Number(dmy[1]));
    const month = pad(Number(dmy[2]));
    let year = dmy[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }
  return null;
}

/** Parsea un valor de celda a hora `HH:MM:SS`, o null. */
export function parseTimeValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    // fracción de día
    const totalSeconds = Math.round(86400 * (value % 1));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${pad(Number(match[1]))}:${match[2]}:${match[3] ?? "00"}`;
}

/** Parsea una celda según el tipo declarado del campo. */
export function parseCellValue(
  field: FieldSchema,
  raw: unknown,
): string | number | string[] | null {
  if (raw == null || raw === "") return field.type === "list" ? [] : null;
  switch (field.type) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "date":
      return parseDateValue(raw);
    case "time":
      return parseTimeValue(raw);
    case "list":
      return String(raw)
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);
    case "string":
    default:
      return String(raw).trim();
  }
}

/** Lee un workbook (ArrayBuffer) y devuelve las hojas reconocidas ya parseadas. */
export function parseWorkbook(buffer: ArrayBuffer): ParsedSheet[] {
  const wb = XLSX.read(buffer, { type: "array" });

  // Índice nombre-de-hoja-normalizado -> entityKey
  const sheetNameToEntity = new Map<string, EntityKey>();
  for (const schema of Object.values(ENTITY_SCHEMAS)) {
    sheetNameToEntity.set(normalizeHeader(schema.sheet), schema.key);
    for (const alias of schema.sheetAliases) {
      sheetNameToEntity.set(normalizeHeader(alias), schema.key);
    }
  }

  const result: ParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const entity = sheetNameToEntity.get(normalizeHeader(sheetName));
    if (!entity) continue;
    const schema = ENTITY_SCHEMAS[entity];
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
    });
    if (matrix.length === 0) continue;

    const headerRow = (matrix[0] as unknown[]).map((h) => (h == null ? "" : String(h)));
    const headerMap = buildHeaderMap(schema, headerRow);
    if (headerMap.size === 0) continue;

    const rows: ParsedRow[] = [];
    for (let r = 1; r < matrix.length; r++) {
      const cells = matrix[r] as unknown[];
      const row: ParsedRow = {};
      let hasData = false;
      for (const [colIndex, fieldKey] of headerMap.entries()) {
        const field = schema.fields.find((f) => f.key === fieldKey)!;
        const parsed = parseCellValue(field, cells[colIndex]);
        row[fieldKey] = parsed;
        if (parsed != null && !(Array.isArray(parsed) && parsed.length === 0)) hasData = true;
      }
      if (hasData) rows.push(row);
    }
    result.push({ entity, rows });
  }

  return result;
}

/** Construye y serializa un workbook a partir de hojas (entidad -> filas de objetos). */
export function buildWorkbookBlob(
  sheets: { entity: EntityKey; rows: Record<string, unknown>[] }[],
): Blob {
  const wb = XLSX.utils.book_new();
  for (const { entity, rows } of sheets) {
    const schema = ENTITY_SCHEMAS[entity];
    const headers = schema.fields.map((f) => f.header);
    const aoa: unknown[][] = [headers];
    for (const row of rows) {
      aoa.push(
        schema.fields.map((f) => {
          const value = row[f.key];
          if (Array.isArray(value)) return value.join(", ");
          return value ?? "";
        }),
      );
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, schema.sheet);
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Genera un workbook plantilla vacío (solo headers) para que el usuario lo rellene. */
export function buildTemplateBlob(): Blob {
  return buildWorkbookBlob(
    (Object.keys(ENTITY_SCHEMAS) as EntityKey[]).map((entity) => ({ entity, rows: [] })),
  );
}
