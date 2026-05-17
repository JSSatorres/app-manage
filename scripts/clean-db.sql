-- Limpiar todos los datos de negocio manteniendo las cuentas de auth
TRUNCATE TABLE public.sesion_detalle     CASCADE;
TRUNCATE TABLE public.sesiones           CASCADE;
TRUNCATE TABLE public.equipos            CASCADE;
TRUNCATE TABLE public.ejercicios         CASCADE;
TRUNCATE TABLE public.documentos         CASCADE;
TRUNCATE TABLE public.parametros_sistema CASCADE;
TRUNCATE TABLE public.sedes              CASCADE;
TRUNCATE TABLE public.workspace_members  CASCADE;
TRUNCATE TABLE public.workspaces         CASCADE;
TRUNCATE TABLE public.sede_invitations   CASCADE;
