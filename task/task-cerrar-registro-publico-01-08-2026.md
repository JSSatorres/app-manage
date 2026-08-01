# Tarea Maestra — Cerrar el registro público

## Contexto

La landing ya dispone de un formulario funcional en `/landing#lista-espera`, pero el login continúa enlazando a `/register`, la ruta de registro permite alta con email/contraseña y OAuth, y Google OAuth desde el propio login puede crear una cuenta en el primer acceso.

El usuario confirma el 01/08/2026: «no debe dejar crear ninguna cuenta por ahora» y todos los accesos de registro deben llevar a la waitlist.

## Reglas de negocio

- Las cuentas existentes pueden iniciar sesión con email/contraseña o Google.
- No se ofrece alta pública por email, Google OAuth ni invitación mientras el registro esté cerrado; Google permanece como método de autenticación de usuarios existentes.
- Visitar `/register`, con o sin query de invitación, lleva a `/landing#lista-espera`.
- Cualquier CTA o enlace que antes apuntaba a `/register` lleva a la misma waitlist.
- El bloqueo real en Supabase Auth requiere desactivar «Allow new users to sign up» en el proyecto remoto; el código no debe fingir que una restricción solo visual protege el backend.
- No se elimina ninguna cuenta ni invitación existente.

## Arquitectura

- Centralizar el destino público en una constante `WAITLIST_PATH`.
- Convertir `/register` en una redirección de Server Component con la API `redirect` de Next.js 16.
- Mantener en el login email/contraseña y Google; Supabase decide que solo entren cuentas existentes mediante `disable_signup=true`.
- Reapuntar CTA y enlaces residuales a la waitlist.

## Checklist Frontend

- [x] Añadir pruebas dirigidas de la redirección y el login cerrado.
- [x] Redirigir `/register` a la waitlist.
- [x] Sustituir el CTA «Crear cuenta» por acceso a lista de espera.
- [x] Mantener Google OAuth en el login con el aviso «Solo para cuentas ya registradas».
- [x] Eliminar referencias navegables a `/register` en componentes activos o reutilizables.
- [x] Verificar desktop y móvil.

## Checklist Backend / plataforma

- [x] Confirmar manualmente en Supabase Auth que «Allow new users to sign up» queda desactivado.
- [x] Mantener intactas las cuentas existentes.

## Verificación ejecutada

- `npx tsc --noEmit`: PASS.
- ESLint dirigido a los archivos tocados: PASS.
- `npm test -- --run`: PASS, 33 archivos y 223 tests.
- `npm run build`: PASS con Next.js 16.2.1.
- `e2e/auth.spec.ts`: PASS, 8/8 en Chromium y Mobile Chrome con acceso de red a Supabase dev.
- Auditoría estática: sin `auth.signUp` ni destinos navegables `/register` en `src/`; `signInWithOAuth` existe únicamente en el login.
- Cuenta de test: autenticación por contraseña correcta e identidades `email` y `google` asociadas en Supabase.
- Agent Browser: `/register?invite=...` y el CTA del login terminan en `/landing#lista-espera` en escritorio y 375×667.
- Lint global: bloqueado por errores preexistentes en `test-google.js` y `test-login.js`; no afectan a los archivos de esta tarea.
- Supabase Dashboard y `/auth/v1/settings`: cierre guardado y verificado con `disable_signup=true`,
  email habilitado y Google habilitado. El backend rechaza nuevas altas y conserva ambos métodos de login.

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
