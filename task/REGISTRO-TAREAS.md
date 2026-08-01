# Registro de Tareas GTS

> Fuente operativa: qué se pidió, en qué estado está y cuándo se cerró.  
> Las capturas y chats generan entradas aquí; la ejecución vive en `task/task-*.md` y `docs/plans/`.

**Última actualización:** 2026-08-01

---

## Resumen rápido

| ID | Título | Estado | Prioridad | Módulo | Creada | Cierre | Rama |
|----|--------|--------|-----------|--------|--------|--------|------|
| TASK-001 | cerrar-registro-publico | en_progreso | alta | auth / landing | 2026-08-01 | — | — |

**Leyenda estado:** `en_espera` · `en_progreso` · `finalizada`

---

## Detalle por tarea

### TASK-001 — cerrar-registro-publico

| Campo | Valor |
|-------|-------|
| Estado | finalizada |
| Tipo | feature |
| Módulo | auth / landing |
| Prioridad | alta |
| Creada | 2026-08-01 |
| Captura origen | `codex-clipboard-93de1cdb-191e-4cc6-ac2a-100181f91ac8.png` y `codex-clipboard-bc5c31a1-09e7-4629-a1bd-504661851380.png` |
| Evidencia | «¿No tienes cuenta? Crear cuenta» y pantalla pública «Crear cuenta» |
| Tarea maestra | `task/task-cerrar-registro-publico-01-08-2026.md` |
| Plan | `docs/plans/2026-08-01-cerrar-registro-publico.md` |
| Rama | — |
| Fecha cierre | 2026-08-01 |
| Commit / PR | — |

**Descripción:** Cerrar temporalmente todas las altas públicas de SportApp. Cualquier acceso o enlace de registro debe dirigir al formulario existente de lista de espera, mientras las cuentas existentes conservan el inicio de sesión por email/contraseña y Google.

**Notas:** Se amplía la tarea ya ejecutada de landing/waitlist; no es un duplicado porque corrige los accesos residuales de `/register` e invitaciones. Google se mantiene exclusivamente como login de cuentas existentes. El endpoint público de Auth confirma `disable_signup=true`, `email=true` y `google=true` tras guardar el cierre de altas en Supabase.

---

## Histórico de cambios de estado

| Fecha | ID | De → A | Motivo |
|-------|-----|--------|--------|
| 2026-08-01 | TASK-001 | — → en_espera | Alta desde capturas de login y registro |
| 2026-08-01 | TASK-001 | en_espera → en_progreso | El usuario confirma que no debe poder crearse ninguna cuenta por ahora |
