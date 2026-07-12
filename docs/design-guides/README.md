# Guías de diseño — manage-sport-app

**Capa propia** del proyecto (el «cómo se escribe el código aquí»). El «cómo trabajamos»
(protocolo, modelos, comandos) es compartido y vive en `ai-dev-config` (ver `AGENTS.md`).

> **Obligatorio (protocolo §3.5):** antes de escribir código en un área, lee su guía y respeta su
> naming y estructura. El código debe parecer escrito por el mismo autor que los archivos vecinos.

## Guías

| Guía | Cubre |
|------|-------|
| [`frontend_styleguide.md`](frontend_styleguide.md) | React 19 / Next.js 16, componentes por dominio, shadcn/ui, formularios (RHF + Zod), estado (Zustand + React Query), hooks, `DataTable`, reglas «no hacer nunca». |
| [`data_styleguide.md`](data_styleguide.md) | Capa de datos: servicios Supabase, `types/`, `schemas/` (Zod), patrón `getSupabaseClient()`, migraciones y su drift. |

Cada guía termina con **«Cómo verificar»** — el contrato que lee el subagente `verifier`:
estático → tests → build → intención → E2E, más acceso a la BD de dev y la auth de test.

## Al añadir una convención nueva

Si una tarea introduce o cambia una convención o el stack, **actualiza la guía correspondiente**
en el mismo PR (Definición de Terminado, protocolo §6). Un cambio que invalida una guía y no la
actualiza no está terminado.
