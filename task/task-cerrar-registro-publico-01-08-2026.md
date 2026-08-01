# Tarea Maestra — Cerrar el registro público

## Contexto

La landing ya dispone de un formulario funcional en `/landing#lista-espera`, pero el login continúa enlazando a `/register`, la ruta de registro permite alta con email/contraseña y OAuth, y Google OAuth desde el propio login puede crear una cuenta en el primer acceso.

El usuario confirma el 01/08/2026: «no debe dejar crear ninguna cuenta por ahora» y todos los accesos de registro deben llevar a la waitlist.

## Reglas de negocio

- Las cuentas existentes pueden iniciar sesión con email y contraseña.
- No se ofrece alta pública por email, Google OAuth ni invitación mientras el registro esté cerrado.
- Visitar `/register`, con o sin query de invitación, lleva a `/landing#lista-espera`.
- Cualquier CTA o enlace que antes apuntaba a `/register` lleva a la misma waitlist.
- El bloqueo real en Supabase Auth requiere desactivar «Allow new users to sign up» en el proyecto remoto; el código no debe fingir que una restricción solo visual protege el backend.
- No se elimina ninguna cuenta ni invitación existente.

## Arquitectura

- Centralizar el destino público en una constante `WAITLIST_PATH`.
- Convertir `/register` en una redirección de Server Component con la API `redirect` de Next.js 16.
- Simplificar el login a email/contraseña, retirando OAuth mientras las altas estén cerradas.
- Reapuntar CTA y enlaces residuales a la waitlist.

## Checklist Frontend

- [ ] Añadir pruebas dirigidas de la redirección y el login cerrado.
- [ ] Redirigir `/register` a la waitlist.
- [ ] Sustituir el CTA «Crear cuenta» por acceso a lista de espera.
- [ ] Retirar Google OAuth del login.
- [ ] Eliminar referencias navegables a `/register` en componentes activos o reutilizables.
- [ ] Verificar desktop y móvil.

## Checklist Backend / plataforma

- [ ] Confirmar manualmente en Supabase Auth que «Allow new users to sign up» queda desactivado.
- [ ] Mantener intactas las cuentas existentes.

## Archivos afectados

- `src/lib/constants.ts`
- `src/app/register/page.tsx`
- `src/app/login/page.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/usuarios/InvitarUsuarioDialog.tsx`
- `src/__tests__/app/register.page.test.ts`
- `src/__tests__/app/login.page.test.tsx`
- `e2e/auth.spec.ts`
- `docs/backlog.md`
- `docs/crud-audit.md`

## Plan de ejecución

- Registro: TASK-001 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-01-cerrar-registro-publico.md`
