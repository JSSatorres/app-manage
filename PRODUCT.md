# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Clubes y academias deportivas que necesitan coordinar su operativa.
- Personal de gestión y coordinación: superadmin, administración y gerencia de sede.
- Entrenadores que trabajan con equipos, jugadores, ejercicios, sesiones y documentos.
- Jugadores que consultan su información fuera del panel de gestión.

## Product Purpose

SportApp es una aplicación de gestión deportiva multi-tenant para organizar sedes, equipos, personas, sesiones, ejercicios y documentos desde un mismo lugar. Su propósito declarado es conectar la rutina del club y mantener su información disponible para los perfiles que la necesitan.

## Positioning

La landing actual posiciona SportApp como una herramienta para clubes y academias de distintos deportes: cada organización configura categorías, objetivos, materiales y posiciones según su vocabulario. También declara una migración desde Excel o enlaces de Google Sheets/Drive que reconoce encabezados y vincula registros por nombre; el producto ofrece exportación a Excel con nombres legibles.

## Operating Context

- El trabajo combina coordinación de sedes, planificación de entrenamientos y consulta de información de jugadores.
- El dashboard muestra una vista semanal de sesiones y permite filtrarlas por sede, periodo y estado.
- Las sesiones se relacionan con equipos, entrenadores, ejercicios, documentos y el dashboard; la programación puede generarse para rangos de fechas, días y franjas horarias.
- La aplicación está pensada también para uso móvil en el campo, con navegación inferior disponible en móvil.
- La cuenta se autentica con Supabase; el acceso actual incluye email/contraseña y Google para cuentas ya registradas. El alta pública redirige a la lista de espera.
- Cada organización opera en un workspace y los datos y permisos se delimitan por workspace.

## Capabilities and Constraints

- Gestiona dashboard, sedes, equipos, entrenadores, jugadores, usuarios, ejercicios, sesiones, documentos, parámetros y configuración.
- Los documentos pueden almacenarse como archivos o enlazarse a recursos externos, y asociarse a sedes, equipos, ejercicios o sesiones.
- Los ejercicios forman una biblioteca con datos de entrenamiento y pueden ser globales del club o propios de una sede.
- Los permisos separan la consulta de la modificación. Los roles canónicos son `superadmin`, `admin`, `gerente_sede`, `entrenador` y `jugador`; el jugador no accede al panel de gestión.
- La interfaz y los textos existentes están en español.
- La aplicación funciona como PWA y ofrece una pantalla cuando no hay conexión.
- El rediseño en curso debe preservar literalmente contenido, rutas, secciones, textos, datos, acciones y funcionalidad actuales. No debe cambiar permisos, validaciones, servicios, consultas ni comportamiento.

## Brand Commitments

- El producto se llama SportApp y la landing lo identifica como un producto de Satorus.es.
- «Banquillo editorial» es la dirección visual confirmada para el rediseño. Es un compromiso de ejecución visual, no una modificación del propósito, las capacidades ni el contenido del producto.

## Evidence on Hand

- La landing contiene descripciones funcionales, preguntas frecuentes y recursos visuales existentes bajo `src/components/landing/` y `public/landing/`.
- Las rutas de la aplicación incluyen las superficies públicas de acceso, lista de espera y offline, y las áreas autenticadas de gestión bajo `src/app/`.
- `ARCHITECTURE.md` confirma la gestión deportiva multi-tenant, App Router, Supabase con RLS y la condición PWA.
- `docs/crud-audit.md` documenta las entidades operativas, sus relaciones por workspace y el alcance actual de sus CRUD.
- No hay en estas fuentes evidencia de precios, clientes, testimonios, casos de estudio ni métricas de rendimiento que se puedan presentar como prueba de producto.

## Product Principles

1. Mantener un dato conectado entre los módulos del club, en vez de duplicarlo por equipo, sede o persona.
2. Adaptarse al vocabulario y la estructura de cada deporte y organización.
3. Ajustar la información y las acciones al rol y al workspace de cada persona.
4. Reducir la fricción de entrada y salida de datos mediante la interoperabilidad declarada con Excel y Google Sheets/Drive.
5. Preservar la verdad de producto existente durante el rediseño visual.

## Accessibility & Inclusion

- Las interacciones existentes incluyen semántica y etiquetas ARIA, foco visible y avisos accesibles en componentes relevantes.
- El rediseño debe conservar navegación por teclado, foco visible, atributos `aria-*`, objetivos táctiles y la preferencia `prefers-reduced-motion`.
