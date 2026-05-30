# Diseño: Importación / Exportación por Excel (y Google Sheets)

> Estado: implementado. Seguido el flujo del orquestador (`.agents/workflows/orquestador-ejemplo.md`)
> en modo autónomo (sin pausas de aprobación, según instrucción del usuario).

## 1. Objetivo

1. **Mover** el botón "Exportar" del `TopBar` a la página **Configuración**.
2. Añadir una sección de **Datos (Importar / Exportar)** en Configuración que permita:
   - **Exportar** todas las entidades del workspace activo a un único `.xlsx` multi-hoja.
   - **Importar** un `.xlsx` (o Google Sheet) que rellene automáticamente todas las entidades.
   - Aceptar **nombres de columna flexibles** (alias) — no obligan a usar el header literal.
   - Origen del archivo: **subida local**, **URL pública de Google Sheets** y **Google Drive conectado** (las tres formas).

## 2. Formato del workbook

Un **único libro Excel multi-hoja** (decisión: lo más cómodo para el usuario, una sola subida).
Una hoja por entidad, en orden de dependencia para que las referencias por nombre se resuelvan:

| Orden | Hoja            | Entidad      | Depende de             |
|-------|-----------------|--------------|------------------------|
| 1     | `Sedes`         | sedes        | —                      |
| 2     | `Entrenadores`  | entrenadores | Sedes, Equipos*        |
| 3     | `Jugadores`     | jugadores    | Sedes, Equipos*        |
| 4     | `Equipos`       | equipos      | Sedes                  |
| 5     | `Ejercicios`    | ejercicios   | Sedes (opcional)       |
| 6     | `Sesiones`      | sesiones     | Equipos, Entrenadores  |

\* Las relaciones equipo↔entrenador y equipo↔jugador se resuelven en una **segunda pasada**
tras crear equipos, así que el orden de hojas no es bloqueante para los pivots.

Pasada de importación:
1. Sedes
2. Equipos (referencia Sede por nombre)
3. Entrenadores (crea + vincula sedes/equipos por nombre)
4. Jugadores (crea + vincula sedes/equipos por nombre)
5. Ejercicios (referencia Sede por nombre, opcional)
6. Sesiones (referencia Equipo + Entrenador por nombre)

Las referencias en las celdas se hacen **por nombre legible** (ej. equipo "Cadete A",
sede "canarias"), no por UUID. El importador construye índices nombre→id de lo ya
existente en BD + lo recién creado en esta misma importación.

Listas múltiples (sedes/equipos de un entrenador/jugador) se escriben en una celda
**separadas por coma o `;`**.

## 3. Mapeo flexible de columnas (alias)

Cada campo declara un **canonical key** + lista de **alias** normalizados (minúsculas, sin
acentos, sin espacios). Al leer una hoja, cada header real se normaliza y se busca en los
alias; así "Nombre del equipo", "nombre", "NOMBRE" mapean todos a `nombre`.

Definido en `src/services/import-export/schema.ts` → `ENTITY_SCHEMAS`.

## 4. Origen del archivo (las 3 formas)

- **Subida local**: `<input type=file>` → `ArrayBuffer` → `XLSX.read`.
- **Google Sheets URL pública**: se transforma la URL del documento a su endpoint de
  export `https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx` y se descarga
  con `fetch`. Requiere que el documento esté compartido como "cualquiera con el enlace".
- **Google Drive conectado**: reutiliza `driveAdapter` (integración existente) para elegir
  el archivo; cae sobre el mismo endpoint de export para Google Sheets nativos.

Toda la lógica de origen vive en `src/services/import-export/source.ts` y devuelve siempre
un `ArrayBuffer` que alimenta al parser.

## 5. Arquitectura de ficheros

```
src/services/import-export/
  schema.ts        # ENTITY_SCHEMAS: campos canónicos + alias + parsers de valor
  workbook.ts      # lectura/escritura xlsx (SheetJS), normalización de headers
  source.ts        # obtención del ArrayBuffer (file | gsheet url | drive)
  export.ts        # buildWorkbook(workspaceId) -> Blob descargable
  import.ts        # importWorkbook(buffer, ctx) -> ImportResult (orquesta pasadas)
  index.ts
src/components/configuracion/
  DataExportImportSection.tsx   # UI con Tabs (Exportar / Importar)
src/__tests__/import-export/
  schema.test.ts
  workbook.test.ts
  import-resolve.test.ts
```

## 6. Resultado de importación

`ImportResult` reporta por entidad: creados, omitidos (duplicados por nombre) y errores
con nº de fila y motivo, mostrados en la UI. La importación es **idempotente por nombre**:
si ya existe una entidad con ese nombre en el workspace, se omite (no se duplica).

## 7. Calidad

- `npm run lint`, `npx tsc --noEmit`, `npm test -- --run` en verde.
- TypeScript estricto, sin `any`. Textos UI en español.
- Verificación visual con navegador (Configuración + TopBar sin botón).