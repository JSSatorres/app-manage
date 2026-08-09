# Gestión económica para clubes Implementation Plan

**Goal:** Construir una sección privada de gestión económica para que cada club controle cuotas y otros cargos a jugadores, cobros, ingresos adicionales, gastos, recurrencias y tesorería básica, y pueda cobrar cargos con Stripe test-mode mediante una cuenta conectada propia, sin presentarla como contabilidad fiscal o legal.

**Architecture:** La navegación se llamará **Economía** y la pantalla **Gestión económica**. El dominio usará una entrada económica común (`cargo de jugador | ingreso | gasto`) y movimientos append-only (`cobro | pago | reembolso | reversión`), aislados por `workspace_id`; los estados de saldo se derivarán de los movimientos para no duplicar verdad. El MVP incluye operación manual y Stripe test-mode: una identidad de plataforma separada de una connected account por workspace, onboarding alojado, direct charges, Checkout y webhook idempotente; nunca una cuenta de cobro compartida entre clubes.

**Tech Stack:** Next.js 16.2 App Router/Route Handlers, React 19.2, TypeScript strict, Supabase/PostgreSQL con RLS, Stripe Connect + Checkout en test-mode, TanStack Query 5, React Hook Form + Zod 4, shadcn/ui, Vitest 4 + Testing Library y Playwright 1.59.

## Perfil de verificación

- Nivel: `full` (no se puede rebajar durante `$exec`).
- Motivo: añade datos económicos persistentes, una migración, RLS/grants, autorización por rol, aislamiento multi-tenant, secretos server-only, onboarding de cuentas, pagos y webhooks.
- Comandos estáticos: `npm run lint` y `npx tsc --noEmit`.
- Tests dirigidos: los comandos `npm test -- --run <rutas>` indicados en cada tarea.
- Suite completa: `npm test -- --run`.
- Build: `npm run build`.
- E2E real: `npm run test:e2e` con `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` y, si se reutiliza storage state, `E2E_STORAGE_STATE`; ejecutar Desktop Chrome y Pixel 5 definidos en `playwright.config.ts`. La prueba Stripe usa solo connected account y tarjetas test, y confirma `livemode=false` sin imprimir claves.
- Cruce Stripe↔webhook↔BD↔servicio↔UI: consultar en development tablas, constraints, índices y policies; probar como `admin`, `superadmin`, `gerente_sede`, `entrenador` y `jugador`; cruzar Checkout/PaymentIntent de la connected account con attempt/movimiento, resumen, detalle por jugador y CSV.
- Evidencias esperadas: ningún rol no autorizado ve la ruta ni puede leer/escribir por API Supabase; no hay acceso ni fondos cruzados entre workspaces; la redirección no marca pagado; el webhook confirmado e idempotente sí; los saldos coinciden; recurrencias no duplican períodos; lint, tipos, suite, build y E2E quedan verdes.

## Incidencias de verificación

<!-- Se rellena durante $exec/$auto solo para fallos major/critical, o minor repetidos/con cambio de alcance. -->

### 09/08/2026 (Europe/Madrid) — Ronda inicial / remediación 1

- **CRITICAL — capa datos/RLS**. Síntoma: un `authenticated` con rol `admin` puede hacer `INSERT` directo en `economic_movements` sin respetar las invariantes de acumulado ni de original. Impacto: se pueden alterar saldos y el historial económico fuera de los flujos previstos. Criterios afectados: 1, 3 y 10. Evidencia: policies/grants y trigger limitado a scope. Estado: **ABIERTO**.
- **CRITICAL — capa pagos/SQL**. Síntoma: `assert_stripe_payment_attempt_scope` exige que `amount` sea el bruto de la entrada, mientras Checkout inserta el saldo pendiente; un parcial de 4.000 sobre 10.000 bloquea el intento de 6.000. Impacto: no se pueden registrar intentos Stripe para saldos parciales pendientes. Criterios afectados: 3 y 9. Evidencia: la aserción SQL y el flujo Checkout descritos. Estado: **ABIERTO**.
- **MAJOR — capa typecheck**. Síntoma inicial: `npx.cmd tsc --noEmit` fallaba porque `tsconfig.json` excluía las Edge Functions y faltaban contratos para Deno/npm de Supabase. Corrección: se retiró la exclusión y se añadió un shim estrecho `runtime.d.ts` junto con los tipos necesarios en `index`. Impacto resuelto: la comprobación de tipos requerida vuelve a cubrir las Edge Functions. Criterio afectado: 11. Evidencia: ESLint dirigido **PASS**, `npx.cmd tsc --noEmit` **PASS** e inclusión confirmada mediante `--listFiles`. Estado: **RESUELTA** (09/08/2026, Europe/Madrid; ronda inicial/remediación 1).
- **MAJOR — capa E2E/infraestructura**. Síntoma: `globalSetup` devuelve `EACCES`; faltan service-role y los prerrequisitos de Stripe test/webhook. Impacto: no se ejecutó ningún E2E Desktop/Pixel, cruce BD↔UI ni E2E Stripe para los criterios 1–11. Criterios afectados: 1–11. Evidencia: fallo de `globalSetup` y ausencia de los prerrequisitos indicados. Estado: **ABIERTO**.

---

## Autorización de migración

- Entorno: `development`.
- Estado: `AUTORIZADA`.
- Decisión: el usuario confirmó literalmente «Sí, autorizo la migración en development» el 08/08/2026 (Europe/Madrid). La autorización es exclusiva para development; `$exec*` debe volver a detenerse si no puede demostrar que el destino es ese entorno.
- Comando/procedimiento previsto:
  1. Inventario read-only con Supabase Management API `POST /v1/projects/{development-project-ref}/database/query/read-only` y `npx supabase migration list` después de enlazar explícitamente el proyecto de development.
  2. Aplicación revisada mediante `POST /v1/projects/{development-project-ref}/database/query` con `read_only: false` y el SQL exacto de `supabase/migrations/20260808120000_gestion_economica.sql`.
  3. Solo después de éxito, reconciliación del historial con `npx supabase migration repair --status applied 20260808120000`.
- Tablas/recursos: `economic_settings`, `economic_categories`, `economic_schedules`, `economic_entries`, `economic_movements`, `economic_audit_events`, `stripe_connected_accounts`, `stripe_payment_attempts`, `stripe_webhook_events`; triggers de `updated_at`, defaults de categorías y auditoría; índices; RLS/policies/grants; tipos generados de Supabase.
- Operaciones: crear tablas/constraints/FK/índices/policies, insertar categorías por defecto en workspaces existentes, crear defaults para nuevos workspaces y añadir inbox/attempt/account state Stripe. No altera ni elimina columnas de tablas deportivas existentes.
- Riesgos: drift del historial remoto; DDL/locks breves; defaults duplicados si falla la idempotencia; denegación accidental a administradores o fuga entre tenants si una policy usa el helper global legacy; escritura privilegiada del webhook; eventos duplicados/desordenados; acumulación de auditoría/inbox; backfill proporcional al número de workspaces. Las tablas económicas no entran en Realtime en el MVP.
- Rollback/recuperación: antes de uso real, retirar navegación y, solo si no existe dato de usuario, eliminar en orden triggers/policies/tablas nuevas mediante una operación explícita y autorizada de Management API y marcar la versión `reverted`; después de existir datos, no hacer rollback destructivo: desactivar la UI, preservar filas y corregir con una migración forward. `migration repair` solo modifica el historial, no ejecuta ni revierte SQL.
- Producción: fuera de `$spec`/`$exec`; revisión y aplicación manual independiente.

### Registro operativo de migración (08/08/2026, Europe/Madrid)

- Aplicación realizada en `development` (`rgmrqkoudyotkpqgezzv`, rama `main`) con `supabase db push --include-all`: **éxito**. Se aplicó `20260808120000_gestion_economica.sql` junto con las migraciones autorizadas del mismo lote.
- Historial posterior: `supabase migration list --linked` confirma `20260808120000` con local/remoto aplicado (`2026-08-08 12:00:00 UTC`).
- Postchecks read-only: existen las nueve tablas económicas/Stripe, RLS está habilitado en todas; constraints, FK compuestas por `workspace_id`, defaults, triggers de scope/auditoría/`updated_at` e índices esperados están presentes. El backfill queda completo: 2/2 workspaces con settings y categorías (44 categorías).
- Seguridad: las policies de las tablas expuestas usan `current_user_ws_role(workspace_id)` para `superadmin`/`admin`; `stripe_webhook_events` no concede privilegios a `authenticated` y no tiene policy pública.
- Tipos: `supabase gen types typescript --linked` regeneró `src/types/database.types.ts` con las nueve tablas; `npx.cmd tsc --noEmit`: **PASS**.

### Autorización correctiva forward (09/08/2026, Europe/Madrid)

- Entorno: `development` (`rgmrqkoudyotkpqgezzv`, rama `main`).
- Estado: `AUTORIZADA`.
- Decisión: el usuario ordenó literalmente « sigue con todas sin parar » y autorizó la corrección forward necesaria, exclusivamente en development, para alinear entradas y recurrencias: `player_charge` exige `player_id`; `income` admite `player_id` opcional; `expense` exige `player_id` nulo. Producción queda fuera.
- Operaciones autorizadas: inventario con `npx.cmd supabase migration list --linked`; crear y aplicar exclusivamente `20260809090000_allow_income_player.sql` mediante `npx.cmd supabase db push --include-all --linked`; postcheck read-only del historial y de ambos constraints. La migración reemplaza solo `economic_schedules_target_check` y `economic_entries_target_check`; conserva los contratos de contraparte y los checks/FK de categoría existentes.
- Riesgo y rollback forward: el `DROP`/`ADD` toma locks DDL breves y un fallo revierte la transacción. No se elimina ningún dato ni se modifica la migración `20260808120000`; si fuese necesario revertir el comportamiento, se creará otra migración forward que restaure ambos checks, tras autorización explícita.
- Registro previo a aplicación: `npx.cmd supabase migration list --linked` mostró exclusivamente `20260809090000` como pendiente; no se autorizó ningún otro pendiente remoto. La simulación `npx.cmd supabase db push --dry-run --include-all --linked` listó solo `20260809090000_allow_income_player.sql`.
- Aplicación: `npx.cmd supabase db push --include-all --linked` finalizó con éxito y aplicó exclusivamente `20260809090000_allow_income_player.sql`.
- Historial posterior: `npx.cmd supabase migration list --linked` confirma `20260809090000` local/remoto aplicado (`2026-08-09 09:00:00 UTC`).
- Postcheck de constraints: el intento read-only `npx.cmd supabase db dump --linked --schema public --file <temporal>` no obtuvo el esquema porque el CLI devolvió `LegacyDockerRunError` (Docker Desktop no disponible). No se registra una verificación remota no realizada; queda pendiente confirmar por Management API/SQL Editor que ambos checks permiten `income` con `player_id` nulo o no nulo y conservan las ramas de `player_charge` y `expense`.
- Sanity TypeScript: `npx.cmd tsc --noEmit` no pasa por `src/__tests__/components/SedeCloneContentSelector.test.tsx(47,14)`: falta `trainerIds` en un `CloneableSesionOption`; no pertenece a esta migración.

## 1. Discovery confirmado

### Hechos del repositorio

- No existe ruta, componente, tabla ni recurso RBAC económico. Las páginas privadas viven en `src/app/(dashboard)/`; `AppSidebar` y `BottomNav` filtran mediante `can(rol, recurso, 'view')`.
- El rol canónico por tenant vive en `workspace_members.role`: `superadmin | admin | gerente_sede | entrenador | jugador`. No existe `owner`. El helper SQL seguro por tenant ya disponible es `current_user_ws_role(workspace_id)`.
- Las policies antiguas de `021_rls_por_rol.sql` usan `current_user_rol()` y un rol legacy global priorizado. **Decisión prohibida:** no copiar ese helper para Economía; un usuario puede pertenecer a varios workspaces.
- El patrón de datos requiere `SELECT_FIELDS` explícito, mapper snake_case→camelCase, `getSupabaseClient()`, filtro `workspace_id` también en mutaciones y Zod. `equipos.service.ts` tiene un bug de scope documentado y no es un patrón a copiar.
- No hay dependencia `stripe`, variables `STRIPE_*`, servidor Supabase/service-role, Checkout, webhooks, tablas ni tests Stripe. La mención histórica G7 es backlog, no implementación.
- No hay script `typecheck`; `npx tsc --noEmit` es válido porque `typescript` está instalado y `tsconfig.json` ya usa `strict`/`noEmit`.
- Hay drift entre migraciones secuenciales y timestamp; la guía prohíbe `supabase db push` y exige Management API + `migration repair`.

### Evidencia externa: hechos, no decisiones de producto

- La LO 1/2002 contempla recursos económicos, administración, contabilidad/documentación, cuotas, derramas y aportaciones de asociados: [BOE, LO 1/2002](https://www.boe.es/buscar/act.php?id=BOE-A-2002-5852&p=20250628&tn=0).
- Los presupuestos institucionales de RFEF incluyen licencias/cuotas, equipamiento, patrocinio, merchandising, derechos y competiciones/eventos. Son evidencia de familias, no de su peso en un club amateur: [RFEF 2025 (PDF)](https://rfef.es/sites/default/files/2025-07/Doc_1_Presupuestos_anuales_para_el_ejercicio_2025.pdf) y [RFEF 2024 (PDF)](https://rfef.es/sites/default/files/2024-10/Presupuesto%202024%20RFEF.pdf).
- La justificación pública para clubes federados enumera personal, desplazamientos/estancias, arbitrajes, material y vestuario, y pide una relación de ingresos y subvenciones: [Generalitat de Catalunya](https://esport.gencat.cat/ca/SG_Esport/consell-catala-de-lesport/ajuts-i-subvencions/PMF-subvencions-activitats-esportives-2023-2024/PMF_subvencions-participacio-clubs-esportius-federats-en-competicions-oficials-23-24/).
- Las subvenciones exigen justificación y conservación de justificantes; el gasto debe estar vinculado, ser necesario y cumplir plazo: [Ley 38/2003, arts. 14, 30 y 31](https://www.boe.es/buscar/act.php?id=BOE-A-2003-20977&p=20150331&tn=1). Esto justifica trazabilidad/exportación, no un módulo fiscal.
- Convocatorias y normas públicas respaldan instalaciones/logística, personal, arbitraje, viajes, seguros, material, marketing/comunicación y tecnología: [Comunidad de Madrid 2026](https://sede.comunidad.madrid/ayudas-becas-subvenciones/subvencion-asociaciones-deportivas-2026), [RD 1125/2025](https://www.boe.es/buscar/doc.php?id=BOE-A-2025-25392) y [RD 588/2024](https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-12862).
- Checkout Sessions cubre pagos únicos/suscripciones y Stripe la recomienda para la mayoría de integraciones; el fulfillment debe depender del webhook, no de la redirección: [Checkout Sessions](https://docs.stripe.com/payments/checkout-sessions) y [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment).
- Stripe puede duplicar y desordenar eventos; exige verificar la firma sobre el body raw, responder pronto y deduplicar: [Stripe webhooks](https://docs.stripe.com/webhooks?lang=node).
- En direct charges el cobro vive en la cuenta conectada y esta es merchant of record; destination/separate charges desplazan más responsabilidad a la plataforma: [Connect charges](https://docs.stripe.com/connect/charges?locale=en-GB), [Direct charges](https://docs.stripe.com/connect/direct-charges) y [Merchant of Record](https://docs.stripe.com/connect/merchant-of-record?locale=en-GB).
- Stripe recomienda onboarding alojado/embebido; Standard, Express y Custom reparten de forma distinta dashboard, soporte, tasas y pérdidas: [Connect accounts](https://docs.stripe.com/connect/accounts?locale=en-GB) y [Onboarding](https://docs.stripe.com/connect/onboarding).
- RGPD exige medidas técnicas/organizativas adecuadas al riesgo y responsabilidad activa: [AEPD, obligaciones](https://www.aepd.es/preguntas-frecuentes/2-tus-obligaciones-como-responsable-del-tratamiento/3-que-obligaciones-establece-el-rgpd-para-los-responsables/FAQ-0219-que-medidas-tengo-que-adoptar-para-cumplir-con-la-normativa) y [AEPD, seguridad](https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/seguridad-de-los-tratamientos).

## 2. Decisiones de producto y terminología

### Nombre e información

- Navegación: **Economía** (`/economia`). Encabezado: **Gestión económica**.
- Evitar **Contabilidad** como nombre principal: el MVP es un registro operativo de cobros/pagos y tesorería, no un libro mayor ni una garantía fiscal.
- Una sola pantalla con vistas `Resumen`, `Cuotas y cobros`, `Ingresos`, `Gastos` y `Configuración`; los filtros persistirán en search params cuando aporte navegación compartible.
- El resumen mostrará: ingresos previstos, cobrado, pendiente, vencido, gastos previstos, pagado y balance real del período. “Balance” no equivale a saldo bancario conciliado.

### Glosario contractual

| Término UI | Contrato |
|---|---|
| Cuota | Regla recurrente que genera cargos; no es un cobro ni una suscripción Stripe. |
| Cargo | Entrada de tipo `player_charge`: importe que un jugador debe al club. |
| Cobro | Movimiento entrante confirmado aplicado a un cargo/ingreso. |
| Ingreso | Entrada esperada adicional no ligada obligatoriamente a un jugador (patrocinio, subvención, torneo, etc.). |
| Gasto | Entrada de salida esperada, con proveedor/contraparte libre. |
| Pago | Movimiento saliente confirmado aplicado a un gasto. |
| Movimiento | Evidencia append-only de cobro, pago, reembolso o reversión. Nunca se borra para “corregir”. |
| Proveedor/contraparte | Texto snapshot en el MVP; un directorio reutilizable queda fuera. |
| Recurrencia | Plantilla semanal, mensual o anual que materializa una entrada por período de forma idempotente. |
| Pendiente/vencido/parcial/pagado | Estado derivado del importe neto de movimientos, fecha y lifecycle; no una bandera editable. |

### Roles y privacidad

- Decisión confirmada el 08/08/2026: `admin` representa al propietario/administrador del club en el MVP; no se crea rol `owner`. `superadmin` conserva su alcance global según la arquitectura existente. `gerente_sede`, `entrenador` y `jugador` no pueden ver ni mutar Economía.
- La sección de administración es privada. Una futura experiencia de pago del jugador será una superficie separada y de mínimo privilegio; no abre acceso a los libros del club.
- No almacenar tarjeta, IBAN, datos de salud, documentación de menores ni PII en metadata Stripe. El MVP solo necesita identificadores internos, nombre snapshot de contraparte y referencias de pago.

### Decisión confirmada sobre Stripe test-mode (08/08/2026)

- El usuario autoriza que **durante `$exec`**, no durante `$spec`, se localice el proyecto hermano PideYa y se reutilicen únicamente sus credenciales Stripe de prueba mediante secret manager o env local gitignored.
- `$exec` debe comprobar sin mostrar valores: clave publicable `pk_test_` si se necesita, clave secreta `sk_test_`, y respuesta API `livemode=false`. Una comprobación fallida detiene Stripe; nunca se cae silenciosamente a una clave live.
- No leer, copiar, imprimir, registrar, commitear ni mover secretos durante este plan. No reutilizar el webhook secret de PideYa: es específico del endpoint y se genera/configura uno nuevo para Manage Sport App.
- La cuenta test de PideYa representa **solo la identidad de plataforma de laboratorio**. Producción requiere identidad/plataforma Stripe propia de Manage Sport App y una connected account distinta por club.
- Separación persistente: configuración/secretos de plataforma son server-only y no viven en tablas; `stripe_connected_accounts` solo guarda el `acct_...` no secreto y estado de capacidades por `workspace_id`.
- El club es el merchant of record recomendado mediante direct charge en su connected account con Dashboard completo/onboarding alojado; no hay cuenta compartida ni mezcla de fondos. La elección exacta de configuración equivalente a Standard/full Dashboard debe verificarse contra la API Stripe vigente antes de crear la primera cuenta y registrarse como decisión difícilmente reversible.

## 3. Modelo e invariantes del MVP

```text
economic_schedule ──materializa──> economic_entry ──se liquida con──> economic_movement
         │                                  │                                  │
         └─ categoría/configuración         └─ jugador/contraparte             └─ refund/reversal
                                            └──────── audit_event <─────────────┘
```

### Tablas y contratos

- `economic_settings`: una fila por `workspace_id`; `currency_code` ISO-4217 (default `EUR`) y `timezone` IANA (default `Europe/Madrid`). Una entrada conserva su moneda snapshot.
- `economic_categories`: `workspace_id`, `direction income|expense`, `code` estable para defaults, `name`, `is_predefined`, `is_active`, auditoría. Defaults se crean por workspace; los predefinidos se activan/desactivan, no se borran. Los personalizados se archivan si ya tienen uso.
- `economic_schedules`: plantilla `player_charge|income|expense`, categoría, concepto, importe minor, moneda, jugador/contraparte opcional según tipo, `weekly|monthly|yearly`, próxima fecha, fin opcional, `active|paused|ended|cancelled`.
- `economic_entries`: `workspace_id`, tipo, categoría, jugador nullable, concepto, contraparte snapshot, `amount_minor bigint`, moneda, fecha de emisión/vencimiento, schedule/período nullable, lifecycle `draft|open|cancelled`, motivo/actor/fecha de cancelación y auditoría.
- `economic_movements`: `workspace_id`, entry, tipo `settlement|refund|reversal`, método `cash|bank_transfer|stripe|other`, `amount_minor bigint`, moneda, estado externo `pending|succeeded|failed|cancelled`, movimiento original nullable, referencia externa y timestamps. No update/delete por clientes autenticados.
- `economic_audit_events`: evento append-only escrito por triggers; entidad/id, acción, actor `auth.uid()`, timestamp y snapshots JSONB mínimo. Solo lectura admin/superadmin dentro del workspace.
- `stripe_connected_accounts`: una fila por `workspace_id`; `stripe_account_id acct_...` unique, configuración de Dashboard/controller, `details_submitted`, `charges_enabled`, `payouts_enabled`, estado `pending|restricted|active|disabled` y última sincronización. El ID no es secreto; no almacena claves del club.
- `stripe_payment_attempts`: un intento por Checkout lógico; entry/workspace/account, amount/currency snapshot, idempotency key, Checkout Session/PaymentIntent nullable y estado `created|open|processing|succeeded|failed|expired|cancelled`. Al éxito se proyecta exactamente un `economic_movement`.
- `stripe_webhook_events`: inbox mínimo con `event_id` unique, connected account, tipo, object id, estado de proceso, intentos/error/timestamps. No persiste payload completo ni PII; el handler recupera el objeto Stripe actual antes de proyectar.

### Categorías por defecto

- Ingresos: `Cuotas de jugadores`, `Matrículas/altas`, `Licencias repercutidas`, `Campus/torneos`, `Entradas`, `Merchandising`, `Patrocinio/publicidad`, `Subvenciones`, `Donaciones`, `Alquiler/cesión de instalaciones`, `Otros ingresos`.
- Gastos: `Instalaciones`, `Material/equipación`, `Arbitraje`, `Licencias/federación`, `Desplazamientos/alojamiento`, `Personal/colaboradores`, `Seguros`, `Tecnología`, `Marketing/comunicación`, `Torneos/eventos`, `Otros gastos`.
- Son categorías operativas configurables; nunca determinan IVA, deducibilidad ni tratamiento fiscal.

### Estados y transiciones

- Entrada almacenada: `draft → open → cancelled`; `cancelled` es terminal. Un entry con movimiento confirmado no cambia importe/moneda/jugador: se corrige con cancelación/nueva entrada o movimiento compensatorio.
- Estado mostrado de una entrada abierta: `pending` si neto 0 y no vencida; `overdue` si neto 0 y vencida; `partial` si `0 < neto < amount`; `paid` si neto alcanza el importe; `partially_refunded|refunded` si reembolsos/reversiones reducen un importe previamente liquidado.
- Movimiento Stripe futuro: `pending → succeeded|failed|cancelled`. Un movimiento succeeded no se edita ni borra; refund/reversal es un hijo positivo que reduce el neto.
- Recurrencia: `active ↔ paused → ended|cancelled`. Generar usa `(schedule_id, period_key)` único; reintentar devuelve la ocurrencia existente.
- Dinero: enteros en minor units, misma moneda entre entry y movimientos, suma dentro de `Number.MAX_SAFE_INTEGER`; ninguna operación usa `float`.
- Tiempo: vencimientos como `date` del club; instantes como `timestamptz`; calendario mensual/anual clampa al último día válido; “vencido” se calcula en timezone del workspace.

## 4. MVP, fases y decisiones prohibidas

### MVP confirmado: primera entrega

- RBAC/RLS admin-only y aislamiento por workspace.
- Resumen y listados filtrables; detalle por jugador.
- Crear cargos individuales, ingresos y gastos manuales; registrar parciales en efectivo/transferencia/otro.
- Cancelar con motivo; reembolsar/revertir mediante movimientos compensatorios; auditoría.
- Categorías default activables y personalizadas archivables.
- Recurrencias semanal/mensual/anual con generación manual idempotente de la siguiente ocurrencia; automatización cron queda fuera.
- Exportación CSV saneada de la vista filtrada y tesorería previsto/real básica.
- Configurar una plataforma Stripe **solo test-mode**, una connected account por workspace con onboarding alojado, direct charges y estado de capacidades visible al admin.
- Generar Checkout Session por el saldo completo de un cargo, compartir su URL, confirmar por webhook firmado/idempotente y permitir reembolso total/parcial desde admin.
- Gate antes de crear cuentas: verificar configuración equivalente a Standard/full Dashboard y responsabilidades; no usar Custom/API onboarding. Payment Links, Billing/Subscriptions y Customer Portal se difieren.

### Fuera del MVP

- Libro mayor, partida doble, plan contable, IVA/impuestos, factura legal, nóminas y asesoramiento contable.
- Conciliación bancaria automática, open banking, importación CAMT/Norma 43 y afirmar que el saldo es bancario.
- Presupuestos aprobatorios, centros de coste, inventario/amortización, multi-divisa dentro de un workspace.
- Directorio completo de proveedores, adjuntos económicos/expediente de subvenciones y retención automática.
- Portal/libro visible al jugador dentro de la app y notificaciones automáticas; el MVP permite pagar mediante URL Checkout alojada generada en la app sin revelar los libros del club.
- Respuesta/gestión de evidencia de disputas dentro de Manage Sport App; se registra la alerta/estado y se opera inicialmente en Stripe Dashboard.
- Cualquier proveedor de pagos distinto de Stripe.

### Decisiones prohibidas

- No usar una cuenta Stripe compartida para todos los clubes ni asumir que la plataforma es MoR.
- No marcar pagado desde `success_url`; solo un movimiento confirmado/manual o webhook verificado cambia el saldo.
- No copiar policies con `current_user_rol()`/`sede_id`; usar `current_user_ws_role(workspace_id)` más filtro de servicio.
- No guardar un `paid` editable además del cálculo de movimientos; no borrar filas para corregir dinero.
- No ejecutar `supabase db push`, no aplicar en producción y no introducir cron/ledger fiscal “por si acaso”.

## 5. Criterios de aceptación end-to-end

1. Los roles finalmente confirmados ven Economía en sidebar y móvil; los demás no la ven, reciben acceso denegado por URL y RLS rechaza lecturas/escrituras directas.
2. Dos workspaces con datos homónimos nunca cruzan categorías, entries, movimientos, schedules, resumen ni CSV.
3. Un cargo de 10.000 minor units con cobros 4.000 + 6.000 pasa `pending → partial → paid`; un refund de 2.000 deja `partially_refunded` y saldo 2.000 sin editar/borrar los cobros.
4. Un gasto pendiente y su pago aparecen como previsto/real en el período correcto; un ingreso de patrocinio funciona sin jugador.
5. Semanal, mensual (incluido día 31) y anual generan una sola ocurrencia por período aun con doble clic/reintento.
6. Desactivar una categoría la oculta de nuevos formularios y conserva el histórico; categorías predefinidas no se eliminan.
7. El CSV respeta filtros, moneda/minor units formateados, zona temporal, cabeceras españolas y neutraliza celdas que empiecen por `=`, `+`, `-` o `@`.
8. Onboarding test crea/asocia una connected account solo al workspace activo; otro workspace nunca puede usarla ni ver su estado.
9. Un Checkout test direct charge confirma `livemode=false`, usa el connected account del club y no marca pagado al volver; webhook válido crea un único movimiento aunque el evento se entregue dos veces o desordenado.
10. Refund total/parcial se ejecuta sobre el charge/PaymentIntent original de la misma connected account, actualiza el neto por webhook y deja auditoría; una firma inválida no escribe nada.
11. Lint, typecheck, suite completa, build, E2E Desktop/Pixel, evidencia SQL/RLS y cruce Stripe↔BD quedan verdes.

## 6. Plan ejecutable TDD

### Task 1: Crear y aplicar el esquema económico multi-tenant

**Skills:** `tdd`, `sql-optimization-patterns`.

**Files:**
- Create: `supabase/migrations/20260808120000_gestion_economica.sql`
- Modify (generado tras aplicar): `src/types/database.types.ts`

**Steps:**
1. Ejecutar inventario read-only de migraciones/tablas/policies en development y confirmar que `20260808120000` no existe. Expected: historial remoto identificado y `to_regclass('public.economic_entries') IS NULL`.
2. Escribir el contrato de schema anterior en una única migración transaccional e idempotente: nueve tablas, FK a `workspaces`, `jugadores` y `auth.users`, checks condicionales, índices y triggers `updated_at`.
3. Añadir defaults de categorías mediante función idempotente, backfill de workspaces existentes y trigger para nuevos workspaces. Expected: unique `(workspace_id, direction, code)` impide duplicados.
4. Añadir audit triggers y policies. Snippet crítico mínimo:

   ```sql
   USING (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
   WITH CHECK (public.current_user_ws_role(workspace_id) IN ('superadmin', 'admin'))
   ```

   Justificación del snippet: evita copiar la autorización legacy global y fija el aislamiento por fila/tenant que debe repetirse en las tablas mutables.
5. Prohibir `DELETE` de entries/movements/audit, prohibir update de movimientos a `authenticated` y permitir lectura/mutación solo según la matriz definida. `stripe_connected_accounts`/`stripe_payment_attempts` son legibles por admin propio pero mutables solo desde Route Handlers autorizados; `stripe_webhook_events` no se expone a `authenticated`. Expected: las policies usan el `workspace_id` de cada fila y no `current_user_rol()`.
6. Revisar SQL y plan de rollback; si `Estado != AUTORIZADA`, parar esta tarea sin aplicar. Si está autorizada, ejecutar Management API exclusivamente contra development.
7. Verificar constraints, defaults, triggers, índices y RLS con queries read-only; probar admin, rol no autorizado y UUID de otro workspace. Expected: admin propio PASS; demás casos permiso denegado/0 filas.
8. Marcar historial con `npx supabase migration repair --status applied 20260808120000` solo tras aplicación exitosa; confirmar con `npx supabase migration list`.
9. Regenerar `src/types/database.types.ts` desde el proyecto development y ejecutar `npx tsc --noEmit`. Expected: nuevas tablas tipadas, PASS.
10. Commit sugerido (solo `$exec-git`): `feat: add multi-tenant economic schema`.

### Task 2: Definir dinero, contratos, schemas y estados derivados

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Create: `src/types/economia.ts`
- Create: `src/schemas/economia.schema.ts`
- Modify: `src/schemas/index.ts`
- Create: `src/lib/economia.ts`
- Create: `src/__tests__/schemas/economia.schema.test.ts`
- Create: `src/__tests__/lib/economia.test.ts`

**Steps:**
1. Escribir un test RED para validar `amountMinor` entero/positivo, moneda ISO en mayúsculas y checks condicionales por `player_charge|income|expense`. Run: `npm test -- --run src/__tests__/schemas/economia.schema.test.ts` · Expected: FAIL por módulos ausentes.
2. Implementar tipos y Zod mínimos para settings, categoría, schedule, entry, movimiento y filtros; exportar schemas desde el barrel. No duplicar Row DB: mapear a contratos UI camelCase.
3. Ejecutar el test dirigido. Expected: PASS.
4. Escribir un test RED para `deriveEconomicStatus` con pending/overdue/partial/paid/refund/cancelled y fecha del workspace. Run: `npm test -- --run src/__tests__/lib/economia.test.ts` · Expected: FAIL.
5. Implementar funciones puras `deriveEconomicStatus`, `calculateOutstandingMinor`, `nextOccurrenceDate` y formateo minor units; clamping 31→fin de mes y leap year.
6. Añadir casos de overflow, moneda distinta, refund superior a settled y calendario inválido. Expected: rechazo controlado, nunca NaN/float.
7. Run: `npm test -- --run src/__tests__/schemas/economia.schema.test.ts src/__tests__/lib/economia.test.ts` y `npx tsc --noEmit` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: define economic domain contracts`.

### Task 3: Implementar settings y categorías con scope obligatorio

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Create: `src/services/economia.service.ts`
- Create: `src/__tests__/services/economia.service.test.ts`
- Create: `src/__tests__/services/economia-tenant-scope.test.ts`

**Steps:**
1. Escribir un test RED al estilo `tenant-scope.test.ts` para exigir `.eq('workspace_id', activeWorkspace)` en list/update y rechazo temprano si falta workspace. Run: `npm test -- --run src/__tests__/services/economia-tenant-scope.test.ts` · Expected: FAIL.
2. Implementar `ECONOMIC_*_SELECT_FIELDS`, mappers null-safe, `fetchEconomicSettings` y `fetchEconomicCategories` con columnas explícitas.
3. Añadir vertical RED→GREEN para activar/desactivar default, crear personalizada y archivar personalizada; no permitir cambiar direction/code de una usada.
4. En todas las mutaciones filtrar por `id` **y** `workspace_id`; devolver `{ data, error, count? }` compatible con hooks existentes.
5. Verificar que una categoría inactiva sigue mapeando entries históricos pero no aparece en opciones de alta.
6. Run: `npm test -- --run src/__tests__/services/economia.service.test.ts src/__tests__/services/economia-tenant-scope.test.ts` · Expected: PASS.
7. Commit sugerido (solo `$exec-git`): `feat: manage economic settings and categories`.

### Task 4: Implementar entries, movimientos y auditoría observable

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Modify: `src/services/economia.service.ts`
- Modify: `src/__tests__/services/economia.service.test.ts`
- Modify: `src/__tests__/services/economia-tenant-scope.test.ts`

**Steps:**
1. Escribir RED para crear/listar cargo de jugador, ingreso sin jugador y gasto con contraparte; comprobar payload snake_case, workspace, minor units y campos condicionales. Expected: FAIL.
2. Implementar `fetchEconomicEntries`, `createEconomicEntry`, `updateEconomicEntry` y `cancelEconomicEntry` con filtros por período/tipo/estado/categoría/jugador.
3. Añadir RED para impedir cambiar importe/moneda/jugador después de un movimiento succeeded y exigir motivo al cancelar.
4. Implementar `recordEconomicMovement` y `recordEconomicAdjustment`; manuales nacen `succeeded`, refund/reversal referencia un movimiento original y no supera su neto.
5. Añadir RED de parcial→paid→partially_refunded usando solo la interfaz pública del servicio y funciones puras, no aserciones de llamadas internas.
6. Verificar que no existe método delete/update de movimiento expuesto y que las mutaciones incluyen `workspace_id`.
7. Verificar audit en development mediante lectura: alta, edición permitida, cancelación y ajuste generan actor/acción/snapshots sin escritura cliente directa.
8. Run: `npm test -- --run src/__tests__/services/economia.service.test.ts src/__tests__/services/economia-tenant-scope.test.ts src/__tests__/lib/economia.test.ts` · Expected: PASS.
9. Commit sugerido (solo `$exec-git`): `feat: track economic entries and movements`.

### Task 5: Materializar recurrencias sin duplicar períodos

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`.

**Files:**
- Modify: `src/services/economia.service.ts`
- Modify: `src/__tests__/services/economia.service.test.ts`
- Modify: `src/__tests__/lib/economia.test.ts`

**Steps:**
1. Escribir RED para crear schedules weekly/monthly/yearly y validar target/fecha/frecuencia. Expected: FAIL.
2. Implementar CRUD sin delete (`active|paused|ended|cancelled`) y scope `workspace_id` en cada operación.
3. Escribir RED para `generateNextEconomicOccurrence(scheduleId, workspaceId)` dos veces en el mismo período. Expected: una sola entry y el segundo resultado reutiliza la existente.
4. Implementar materialización con `period_key` determinista y constraint único como última defensa; avanzar `next_due_date` solo tras insert/lookup exitoso.
5. Añadir casos día 31, 29/02, end date y schedule paused/cancelled. Expected: no genera fuera de rango.
6. Run: `npm test -- --run src/__tests__/services/economia.service.test.ts src/__tests__/lib/economia.test.ts` · Expected: PASS.
7. Commit sugerido (solo `$exec-git`): `feat: add idempotent economic schedules`.

### Task 6: Exponer el dominio mediante TanStack Query

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (solo TanStack Query/server state).

**Files:**
- Modify: `src/hooks/queryKeys.ts`
- Create: `src/hooks/useEconomia.ts`
- Create: `src/__tests__/hooks/useEconomia.test.tsx`

**Steps:**
1. Escribir RED con `renderHook` para query keys que incluyan workspace y filtros, y query desactivada sin workspace. Run: `npm test -- --run src/__tests__/hooks/useEconomia.test.tsx` · Expected: FAIL.
2. Añadir `economicKeys` con prefijos separados para summary, entries, categories y schedules; ninguna clave omite `workspaceId`.
3. Implementar `useEconomia` reutilizando `useQuery`/`useMutation` del proyecto; no duplicar server state en Zustand.
4. Añadir RED→GREEN por mutación para invalidar summary + lista afectada + detalle, manteniendo filtros.
5. Exponer estados/acciones en español de dominio y errores controlados; evitar optimistic update en dinero.
6. Run: `npm test -- --run src/__tests__/hooks/useEconomia.test.tsx` y `npx tsc --noEmit` · Expected: PASS.
7. Commit sugerido (solo `$exec-git`): `feat: expose economic query hooks`.

### Task 7: Añadir RBAC, navegación y shell privado

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Modify: `src/lib/permisos.ts:11-73`
- Modify: `src/__tests__/permisos.test.ts:10-90`
- Modify: `src/components/shared/AppSidebar.tsx:32-41,86-88`
- Modify: `src/components/shared/BottomNav.tsx:53-73`
- Modify: `src/__tests__/components/navigation.test.tsx:1-60`
- Create: `src/app/(dashboard)/economia/page.tsx`
- Create: `src/__tests__/app/economia.page.test.tsx`
- Create: `src/components/economia/EconomiaPage.tsx`

**Steps:**
1. Escribir RED: `can(superadmin|admin,'economia','view|mutate')` true y resto false. Run: `npm test -- --run src/__tests__/permisos.test.ts` · Expected: FAIL.
2. Añadir `economia` a `Recurso` y `PERMISOS` con la matriz confirmada.
3. Escribir RED de navegación desktop/móvil: Economía visible solo para autorizados y `/economia` marca `aria-current`.
4. Añadir el item a sidebar y sección Administración móvil con icono coherente y label español.
5. Escribir RED de la página: `RequireRol` admite solo roles confirmados y renderiza `EconomiaPage` dentro del workspace activo.
6. Crear page mínima y shell con `PageHeader`, tabs accesibles y estados loading/error/empty; no implementar aún formularios.
7. Run: `npm test -- --run src/__tests__/permisos.test.ts src/__tests__/components/navigation.test.tsx src/__tests__/app/economia.page.test.tsx` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: add protected economy navigation`.

### Task 8: Construir resumen, filtros y listados económicos

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (TanStack Query).

**Files:**
- Create: `src/components/economia/EconomiaResumen.tsx`
- Create: `src/components/economia/MovimientosEconomicosTable.tsx`
- Modify: `src/components/economia/EconomiaPage.tsx`
- Create: `src/__tests__/components/EconomiaResumen.test.tsx`
- Create: `src/__tests__/components/MovimientosEconomicosTable.test.tsx`

**Steps:**
1. Escribir RED del resumen con fixture: previstos, reales, pendiente, vencido y balance; comprobar que no lo etiqueta “saldo bancario”.
2. Implementar cards accesibles y período explícito; derivar totales de entries/movimientos ya scoped, sin re-sumar strings formateados.
3. Escribir RED del listado por jugador/entry con concepto, vencimiento, total, neto, pendiente y estado; usar encabezados/acciones accesibles.
4. Implementar filtros por search params: período, tipo, estado, categoría, jugador; reset conserva `/economia`.
5. Añadir empty state diferenciado: sin datos vs sin resultados; loading con skeleton; error con reintento.
6. Verificar layout mobile sin scroll horizontal obligatorio y desktop con `DataTable` si encaja su API real.
7. Run: `npm test -- --run src/__tests__/components/EconomiaResumen.test.tsx src/__tests__/components/MovimientosEconomicosTable.test.tsx` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: build economic overview`.

### Task 9: Crear y editar cargos, ingresos y gastos manuales

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (mutaciones TanStack Query).

**Files:**
- Create: `src/components/economia/EntradaEconomicaForm.tsx`
- Create: `src/components/economia/EntradaEconomicaDialog.tsx`
- Modify: `src/components/economia/EconomiaPage.tsx`
- Create: `src/__tests__/components/EntradaEconomicaForm.test.tsx`

**Steps:**
1. Escribir RED para cargo: exige jugador, categoría de ingreso activa, concepto, importe, moneda y vencimiento; submit entrega minor units.
2. Implementar un formulario RHF+Zod con campos condicionales por tipo; no crear tres formularios divergentes.
3. Añadir RED para ingreso adicional (jugador opcional) y gasto (categoría expense + proveedor libre).
4. Implementar alta/edit dialog con copy español y feedback; bloquear tipo/importe/moneda/jugador si existen movimientos.
5. Añadir RED de cancelación con confirmación y motivo obligatorio; cancelado permanece visible en histórico.
6. Run: `npm test -- --run src/__tests__/components/EntradaEconomicaForm.test.tsx` · Expected: PASS.
7. Commit sugerido (solo `$exec-git`): `feat: add economic entry forms`.

### Task 10: Registrar parciales, pagos y ajustes sin borrar historia

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (mutaciones TanStack Query).

**Files:**
- Create: `src/components/economia/MovimientoEconomicoForm.tsx`
- Create: `src/components/economia/HistorialMovimientos.tsx`
- Modify: `src/components/economia/MovimientosEconomicosTable.tsx`
- Create: `src/__tests__/components/MovimientoEconomicoForm.test.tsx`
- Create: `src/__tests__/components/HistorialMovimientos.test.tsx`

**Steps:**
1. Escribir RED para cobro parcial manual: máximo outstanding, método permitido, fecha/referencia, moneda heredada.
2. Implementar formulario único que rotula `Registrar cobro` para income/charge y `Registrar pago` para expense.
3. Añadir RED para segundo parcial que completa la entry y actualiza resumen/listado tras invalidación.
4. Añadir RED para refund/reversal: exige movimiento original + motivo, no permite exceder neto ni cruzar workspace/moneda.
5. Implementar historial cronológico con badges de tipo/estado, actor/fecha y sin botones de editar/borrar.
6. Verificar copy de conciliación: “registrado manualmente”, nunca “confirmado por banco”.
7. Run: `npm test -- --run src/__tests__/components/MovimientoEconomicoForm.test.tsx src/__tests__/components/HistorialMovimientos.test.tsx` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: record partial economic settlements`.

### Task 11: Gestionar categorías y periodicidades

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (mutaciones TanStack Query).

**Files:**
- Create: `src/components/economia/CategoriasEconomicas.tsx`
- Create: `src/components/economia/RecurrenciaEconomicaForm.tsx`
- Create: `src/components/economia/RecurrenciasEconomicas.tsx`
- Modify: `src/components/economia/EconomiaPage.tsx`
- Create: `src/__tests__/components/CategoriasEconomicas.test.tsx`
- Create: `src/__tests__/components/RecurrenciasEconomicas.test.tsx`

**Steps:**
1. Escribir RED: toggles de defaults, alta personalizada y archive conservan usos históricos.
2. Implementar settings de categorías con separación Ingresos/Gastos, estado accesible y confirmación al archivar.
3. Escribir RED para weekly/monthly/yearly, próxima fecha preview, pausa/reactivación y fin opcional.
4. Implementar formulario y lista de schedules; mostrar explícitamente “generación manual” en el MVP.
5. Escribir RED de doble acción “Generar siguiente”: una sola entry, enlace a detalle y nueva próxima fecha.
6. Implementar lock/debounce UI como ergonomía, sin confiar en él para idempotencia (manda el unique DB).
7. Run: `npm test -- --run src/__tests__/components/CategoriasEconomicas.test.tsx src/__tests__/components/RecurrenciasEconomicas.test.tsx` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: configure economic categories and schedules`.

### Task 12: Exportar reporting operativo seguro

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Create: `src/lib/economiaCsv.ts`
- Create: `src/__tests__/lib/economiaCsv.test.ts`
- Create: `src/components/economia/ExportarEconomiaButton.tsx`
- Create: `src/__tests__/components/ExportarEconomiaButton.test.tsx`
- Modify: `src/components/economia/EconomiaPage.tsx`

**Steps:**
1. Escribir RED para CSV español con cargo/ingreso/gasto, importes, moneda, fechas, estado, pagador/contraparte y saldo; omitir IDs internos salvo referencia operativa necesaria.
2. Añadir RED de escaping RFC 4180, UTF-8/BOM si lo requiere Excel y neutralización de fórmulas (`=`, `+`, `-`, `@`).
3. Implementar serializador puro y nombre de archivo con período/workspace sin PII.
4. Implementar export de **todo** el filtro actual por páginas controladas, no solo la página visible; mostrar total y error si el resultado queda incompleto.
5. Verificar que la exportación reusa servicio scoped/RLS y no incluye audit JSON, metadata Stripe futura ni datos de tarjeta.
6. Run: `npm test -- --run src/__tests__/lib/economiaCsv.test.ts src/__tests__/components/ExportarEconomiaButton.test.tsx` · Expected: PASS.
7. Commit sugerido (solo `$exec-git`): `feat: export economic reports`.

### Task 13: Crear la frontera server-only y trasladar secretos test de forma protegida

**Skills:** `tdd`, `javascript-testing-patterns`.

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `src/lib/serverEnv.ts`
- Create: `src/lib/stripe.ts`
- Create: `src/services/supabase-server.ts`
- Create: `src/lib/apiAuth.ts`
- Create: `src/__tests__/lib/serverEnv.test.ts`
- Create: `src/__tests__/lib/apiAuth.test.ts`

**Steps:**
1. Precondición protegida de `$exec`: con la autorización del 08/08/2026, localizar PideYa sin imprimir archivos/env; trasladar únicamente `pk_test_` si acaba siendo necesaria y `sk_test_` mediante secret manager o `.env.local` gitignored. No copiar secretos a comandos, chat, logs, fixtures ni repo.
2. Crear/configurar para Manage Sport App secretos propios de endpoint `STRIPE_WEBHOOK_SECRET` y `STRIPE_CONNECT_WEBHOOK_SECRET`; no reutilizar el `whsec_` de PideYa. Obtener/configurar `SUPABASE_SERVICE_ROLE_KEY` del Supabase development de Manage Sport, no de PideYa.
3. Escribir RED con valores dummy para que `serverEnv` rechace ausencia, `sk_live_`, `pk_live_` y combinaciones incompletas, sin incluir credenciales reales. Run: `npm test -- --run src/__tests__/lib/serverEnv.test.ts` · Expected: FAIL.
4. Ejecutar `npm install stripe`; encapsular variables en un módulo `server-only`. `.env.example` lista nombres sin valores: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` solo si una UI Stripe la requiere.
5. Crear singleton Stripe server-only con versión API fijada por el SDK instalado. Verificar en runtime test: prefijo esperado y `stripe.accounts.retrieve()` de plataforma; `livemode` debe ser false. No loguear key ni respuesta completa.
6. Escribir RED para auth de Route Handler: bearer ausente/inválido→401; miembro de otro workspace→403; `admin|superadmin` confirmado→contexto `{userId, workspaceId, role}`. Expected: FAIL.
7. Implementar cliente Supabase server por bearer/anon para identidad+RLS y cliente service-role separado exclusivamente para webhooks/estado Stripe. Nunca importar service client desde componentes/client bundles.
8. Implementar `requireWorkspaceAdmin(request, workspaceId)` sobre `workspace_members`; no confiar en rol enviado por body ni en `usuarios.rol` legacy.
9. Run: `npm test -- --run src/__tests__/lib/serverEnv.test.ts src/__tests__/lib/apiAuth.test.ts`, `npx tsc --noEmit` y `npm run build` · Expected: PASS sin secretos en output/bundle.
10. Commit sugerido (solo `$exec-git`): `feat: add secure Stripe server boundary`.

### Task 14: Onboardear una connected account por club

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (mutaciones/estado servidor).

**Files:**
- Create: `src/app/api/stripe/connect/account/route.ts`
- Create: `src/app/api/stripe/connect/account-link/route.ts`
- Create: `src/app/api/stripe/connect/status/route.ts`
- Create: `src/app/api/stripe/webhook/route.ts`
- Create: `src/__tests__/api/stripe-connect-account.route.test.ts`
- Create: `src/__tests__/api/stripe-account-link.route.test.ts`
- Create: `src/__tests__/api/stripe-platform-webhook.route.test.ts`
- Create: `src/components/economia/StripeConnectionCard.tsx`
- Create: `src/__tests__/components/StripeConnectionCard.test.tsx`
- Modify: `src/components/economia/EconomiaPage.tsx`

**Steps:**
1. Antes de crear la primera cuenta, contrastar el SDK instalado con docs Stripe actuales y fijar controller properties equivalentes a Standard/full Dashboard: club/Stripe soporta fees y pérdidas, Stripe recopila requirements, Dashboard completo. No fijar país/capabilities innecesarios.
2. Escribir RED: solo admin del workspace puede crear/obtener una connected account; segundo POST devuelve la misma fila/account y otro workspace no puede verla. Run: `npm test -- --run src/__tests__/api/stripe-connect-account.route.test.ts` · Expected: FAIL.
3. Implementar creación idempotente con plataforma test, persistiendo solo `acct_...` + controller/status; si la llamada Stripe tuvo éxito y persistencia falló, reconciliar por metadata `workspace_id` antes de reintentar.
4. Escribir RED para Account Link `account_onboarding`: requiere account del mismo workspace, `refresh_url`/`return_url` derivadas de `APP_URL`, URL nunca persistida como credencial.
5. Implementar hosted onboarding y status refresh consultando Stripe; la vuelta del navegador no marca account active por sí sola.
6. Escribir RED de webhook plataforma: body/firma inválida→400 sin writes; `account.updated` actualiza solo el workspace cuyo `stripe_account_id` coincide; evento repetido es no-op 2xx.
7. Implementar `/api/stripe/webhook` con body raw, `STRIPE_WEBHOOK_SECRET`, inbox y service client; persistir `details_submitted`, `charges_enabled`, `payouts_enabled` y requirements/status mínimo.
8. Escribir RED/implementar `StripeConnectionCard`: estados no configurado/pendiente/restringido/activo, CTA onboarding/continuar/actualizar y explicación “Los cobros llegan a la cuenta Stripe del club”.
9. Run: `npm test -- --run src/__tests__/api/stripe-connect-account.route.test.ts src/__tests__/api/stripe-account-link.route.test.ts src/__tests__/api/stripe-platform-webhook.route.test.ts src/__tests__/components/StripeConnectionCard.test.tsx` · Expected: PASS.
10. Commit sugerido (solo `$exec-git`): `feat: onboard club Stripe accounts`.

### Task 15: Cobrar cargos con Checkout direct charge y webhook idempotente

**Skills:** `tdd`, `javascript-testing-patterns`, `sql-optimization-patterns`, `react-state-management` (mutaciones/estado servidor).

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/connect-webhook/route.ts`
- Create: `src/lib/stripeEvents.ts`
- Create: `src/__tests__/api/stripe-checkout.route.test.ts`
- Create: `src/__tests__/api/stripe-connect-webhook.route.test.ts`
- Create: `src/__tests__/lib/stripeEvents.test.ts`
- Create: `src/components/economia/StripeCheckoutButton.tsx`
- Create: `src/__tests__/components/StripeCheckoutButton.test.tsx`
- Modify: `src/components/economia/HistorialMovimientos.tsx`

**Steps:**
1. Escribir RED de Checkout: admin propio + account active + cargo open/outstanding positivo→Session; rol/workspace/account/currency inválidos o gasto→403/409/422. Run: `npm test -- --run src/__tests__/api/stripe-checkout.route.test.ts` · Expected: FAIL.
2. Crear primero `stripe_payment_attempts` con UUID/idempotency key; calcular saldo server-side desde DB, nunca aceptar amount/currency/connected account del cliente.
3. Crear Checkout Session con secret de plataforma y request option/header `Stripe-Account: acct_...` de ese workspace (direct charge), `mode=payment`, saldo completo, metadata opaca `workspace_id|entry_id|attempt_id`, y success/cancel URL a Economía. No application fee en MVP.
4. Persistir Session ID/url/status sin loguear URL; reintento lógico con el mismo attempt usa misma idempotency key. Un nuevo intento solo se permite tras failed/expired/cancelled.
5. Escribir RED de retorno UI: abrir success solo muestra “Estamos confirmando el pago”; no crea movimiento ni cambia saldo.
6. Escribir RED de Connect webhook: firma raw inválida no escribe; evento duplicado no duplica; evento de connected account desconocida se registra/rechaza sin asociarlo; orden inverso converge al estado Stripe actual.
7. Implementar `/api/stripe/connect-webhook` con `STRIPE_CONNECT_WEBHOOK_SECRET`. Para `checkout.session.completed`, `checkout.session.async_payment_succeeded|failed`, recuperar Session/PaymentIntent actual usando secret de plataforma + `Stripe-Account`, validar account/metadata/amount/currency y actualizar attempt.
8. En éxito, insertar exactamente un `economic_movement settlement/stripe/succeeded` con referencia externa unique; en fallo/expiración no tocar saldo. No almacenar payload completo/PII.
9. Procesar `charge.dispute.created|closed` como alerta/estado del attempt, sin responder evidencia desde la app.
10. Implementar CTA “Generar enlace de pago” solo para cargo pendiente y account active; copiar/compartir URL Checkout, sin conceder acceso del jugador a `/economia`.
11. Run: `npm test -- --run src/__tests__/api/stripe-checkout.route.test.ts src/__tests__/api/stripe-connect-webhook.route.test.ts src/__tests__/lib/stripeEvents.test.ts src/__tests__/components/StripeCheckoutButton.test.tsx` · Expected: PASS.
12. Commit sugerido (solo `$exec-git`): `feat: collect club charges with Stripe Checkout`.

### Task 16: Reembolsar direct charges y conciliar su estado

**Skills:** `tdd`, `javascript-testing-patterns`, `react-state-management` (mutaciones/estado servidor).

**Files:**
- Create: `src/app/api/stripe/refunds/route.ts`
- Create: `src/__tests__/api/stripe-refunds.route.test.ts`
- Create: `src/components/economia/StripeRefundDialog.tsx`
- Create: `src/__tests__/components/StripeRefundDialog.test.tsx`
- Modify: `src/lib/stripeEvents.ts`
- Modify: `src/app/api/stripe/connect-webhook/route.ts`
- Modify: `src/__tests__/api/stripe-connect-webhook.route.test.ts`
- Modify: `src/components/economia/HistorialMovimientos.tsx`

**Steps:**
1. Escribir RED: refund exige admin, motivo, settlement Stripe succeeded del mismo workspace/account y amount positivo ≤ neto reembolsable. Run: `npm test -- --run src/__tests__/api/stripe-refunds.route.test.ts` · Expected: FAIL.
2. Crear solicitud idempotente usando secret de plataforma + `Stripe-Account` y Charge/PaymentIntent original. No hay application fee en MVP; si se añade en el futuro, definir explícitamente `refund_application_fee`.
3. Devolver estado “solicitado/procesando”; no insertar refund succeeded desde la respuesta HTTP.
4. Escribir RED para `charge.refunded` y, si el SDK/eventos reales lo requieren, `refund.created|updated`: recuperar objeto actual, deduplicar y crear/actualizar un único movimiento `refund` ligado al settlement.
5. Implementar proyección por webhook y mostrar refunds pending/succeeded/failed; saldo deriva solo de succeeded.
6. Escribir RED/implementar dialog de refund total/parcial con máximo, moneda, motivo y advertencia sobre saldo de la cuenta del club.
7. Run: `npm test -- --run src/__tests__/api/stripe-refunds.route.test.ts src/__tests__/api/stripe-connect-webhook.route.test.ts src/__tests__/components/StripeRefundDialog.test.tsx` · Expected: PASS.
8. Commit sugerido (solo `$exec-git`): `feat: refund Stripe club charges`.

### Task 17: Ejecutar verificación full independiente

**Skills:** `tdd`, `javascript-testing-patterns`; E2E por subagente `testing` con `agent-browser` (cargar `agent-browser skills get core` antes de usarlo).

**Files:**
- Create: `e2e/economia.spec.ts`
- Create: `e2e/economia-stripe.spec.ts`
- Modify solo si el entorno real lo exige: `E2E_TESTING.md`
- Modify durante ejecución solo ante incidencias relevantes: `docs/plans/2026-08-08-gestion-economica-clubes.md` → `## Incidencias de verificación`

**Steps:**
1. Escribir E2E RED para admin: navegar, crear cargo/gasto/ingreso, registrar parciales, filtrar, exportar y cancelar. Run: `npm run test:e2e -- e2e/economia.spec.ts` · Expected: FAIL antes del flujo completo.
2. Añadir fixtures mínimos en un workspace de prueba y limpieza scoped, sin truncar tablas compartidas.
3. Añadir casos E2E de rol no autorizado y cambio de workspace; cruzar UI con queries DB read-only.
4. Con secrets inyectados sin output, verificar `sk_test_` y plataforma `livemode=false`; crear fixture connected account test con controller full Dashboard/hosted onboarding. No guardar `acct_...` real en repo.
5. Configurar los dos endpoints locales/preview. Comando CLI oficial de referencia: `stripe listen --forward-to localhost:3000/api/stripe/webhook --forward-connect-to localhost:3000/api/stripe/connect-webhook`. El `whsec_` mostrado por CLI debe introducirlo el usuario/secret manager fuera de logs capturados.
6. Escribir E2E Stripe RED: onboarding/status, Checkout direct charge 4242, retorno processing, webhook→paid, replay del evento→sin duplicado y refund→neto actualizado. Añadir 3DS `4000 0025 0000 3155` y decline `4000 0000 0000 9995` como casos dirigidos.
7. Cruzar por Stripe API bajo `Stripe-Account` que Session/PaymentIntent/Charge viven en el connected account del workspace y que otro workspace no puede referenciarlos.
8. Ejecutar `npm run lint` · Expected: PASS.
9. Ejecutar `npx tsc --noEmit` · Expected: PASS.
10. Ejecutar tests dirigidos de todas las tareas · Expected: PASS.
11. Delegar suite silenciosa a `test-runner`: `npm test -- --run` · Expected: PASS.
12. Ejecutar `npm run build` · Expected: PASS.
13. Delegar E2E real a `testing`/`agent-browser`: `npm run test:e2e` en Desktop Chrome + Pixel 5, Checkout Stripe test y revisión visual/teclado de `/economia` · Expected: PASS.
14. Verifier independiente revisa SQL/RLS, multi-tenant, frontera server-only, Connect/MoR, webhooks, importes, auditoría, privacidad y criterios 1–11. Si falla, registrar solo major/critical y repetir perfil full tras remediación.
15. Commit sugerido (solo `$exec-git`): `test: cover economic management and Stripe flows`.

### Task 18 (final): Actualizar documentación

**Skills:** `writing-plans` (Definición de Terminado; sin código de producción).

**Files:**
- Modify: `docs/backlog.md`
- Modify: `docs/crud-audit.md`
- Modify si introduce convención nueva: `docs/design-guides/frontend_styleguide.md`
- Modify si introduce convención nueva: `docs/design-guides/data_styleguide.md`
- Create: `docs/adr/` solo si ya existe la convención ADR al ejecutar; en caso contrario registrar las decisiones económicas en `docs/crud-audit.md` sin inventar una carpeta
- Modify: `docs/plans/2026-08-08-gestion-economica-clubes.md`

**Steps:**
1. Marcar el bloque económico/Stripe test-mode del backlog como completado únicamente tras perfil full verde; dejar Billing/Portal, player portal y producción Stripe como pendientes separados.
2. Añadir al CRUD audit tablas, ownership, lifecycle, RLS, servicios/hooks/UI y limitaciones del MVP.
3. Documentar solo convenciones realmente nuevas: minor units, entries/movements append-only, helper RLS por workspace y recurrencia idempotente. No copiar este plan entero.
4. Registrar decisiones duraderas: nombre Economía, no contabilidad legal, club como futuro MoR, Connect por club, manual vs Stripe source of truth y fuera de alcance.
5. Completar autorización/incidencias/evidencias finales del plan con fecha Europe/Madrid.
6. Verificar enlaces/rutas y LF; ejecutar `npm run lint` si los docs participan en lint, en otro caso revisión Markdown manual.
7. Commit sugerido (solo `$exec-git`): `docs: document economic management module`.

## 7. Diseño Stripe confirmado para el MVP test-mode

1. **Titularidad:** una connected account por workspace; direct charge en esa cuenta; club como merchant of record. La plataforma no concentra fondos ni usa una cuenta compartida. En producción, la plataforma Stripe será de Manage Sport App; PideYa solo presta credenciales de laboratorio test-mode.
2. **Onboarding:** Stripe-hosted. Antes de crear la primera account, usar controller properties actuales equivalentes a Standard/full Dashboard (`stripe_dashboard=full`, fees pagadas por account, losses por Stripe, requirements por Stripe) y registrar la configuración efectiva. Referencias: [controller properties](https://docs.stripe.com/connect/migrate-to-controller-properties), [SaaS Dashboard](https://docs.stripe.com/connect/saas/tasks/dashboard) y [hosted onboarding](https://docs.stripe.com/connect/hosted-onboarding?locale=en-GB).
3. **Checkout:** Session por entry y saldo completo; metadata solo `workspace_id`/`entry_id` opacos; idempotency key estable por intento lógico. Checkout crea/gestiona PaymentIntent, por lo que no se añade una API paralela sin necesidad.
4. **Webhook:** Route Handlers server-only separados para plataforma y connected accounts, body raw, secret por endpoint, firma, inbox unique por `event.id`, connected account, `event.type + object.id`, procesamiento reintentable y tolerante a desorden; 2xx tras persistencia/proyección breve. La redirección solo muestra “pago en procesamiento”. [Connect webhooks](https://docs.stripe.com/connect/webhooks).
5. **Fuentes de verdad:** Stripe manda sobre hechos externos del cobro/reembolso/disputa; PostgreSQL manda sobre obligación, asignación y vista operativa. El webhook proyecta hechos Stripe a movimientos idempotentes.
6. **Dinero/tiempo:** amount/currency deben coincidir con outstanding y settings; minor units y currency de Stripe; `timestamptz` para eventos, `date` del workspace para vencimiento.
7. **Reembolsos/disputas:** refund total/parcial contra PaymentIntent/charge original; persistir evento y estado, nunca ocultar el movimiento. Disputa genera alerta/estado; responder evidencia queda inicialmente en Stripe Dashboard.
8. **Entorno:** añadir `stripe` y variables server-only (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`). `$exec` traslada PideYa→Manage Sport solo mediante entorno seguro, verifica `sk_test_`/`pk_test_` si aplica y `livemode=false`, y nunca expone/commitea valores.
9. **Superficie pagador:** generar enlace seguro desde Economía y compartirlo, o crear una vista mínima para el jugador en una especificación posterior. Esa vista no concede acceso a información económica del club.

## 8. Handoff para `$exec`

- Leer antes de tocar código: `AGENTS.md`, `docs/design-guides/frontend_styleguide.md`, `docs/design-guides/data_styleguide.md` y las guías locales Next.js 16 `15-route-handlers.md`, `cookies.md`, `server-and-client-components.md` y `authentication.md` si una tarea introduce Route Handlers.
- Ejecutar tareas en orden y en slices RED→GREEN; no escribir todos los tests por adelantado.
- `$exec` debe detenerse en Task 1 si la autorización sigue pendiente/denegada o si no se demuestra que el destino es development.
- Adaptar líneas desplazadas al código real sin cambiar contratos, RLS, criterios ni alcance.
- `$spec` no hace commits. Los mensajes son sugerencias exclusivas para `$exec-git`.
