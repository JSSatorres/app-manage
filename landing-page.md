# SportApp — Landing Page · Documento de Diseño y Contenido

> **Propósito de este documento:** Diseño completo de la landing page de presentación y venta de SportApp. Incluye estructura de secciones, copy, argumentario competitivo, videos explicativos y notas de diseño. Basado en exploración exhaustiva de la aplicación real (junio 2026).

---

## ÍNDICE

1. [Visión general y posicionamiento](#1-visión-general-y-posicionamiento)
2. [Hero Section](#2-hero-section)
3. [Problema que resuelve](#3-el-problema-que-resuelves)
4. [Vista general de la plataforma](#4-vista-general-de-la-plataforma)
5. [Módulos en detalle](#5-módulos-en-detalle)
6. [Feature estrella: Notas de sesión en tiempo real](#6-feature-estrella-notas-de-sesión-en-tiempo-real)
7. [SportApp vs Excel + Drive](#7-sportapp-vs-excel--drive)
8. [Diseño multi-sede](#8-diseño-multi-sede)
9. [Roles y permisos](#9-roles-y-permisos)
10. [Sección de Videos Explicativos](#10-sección-de-videos-explicativos)
11. [Testimonios / Social Proof](#11-testimonios--social-proof)
12. [Precios](#12-precios)
13. [CTA Final](#13-cta-final)
14. [Footer](#14-footer)
15. [Notas técnicas de implementación](#15-notas-técnicas-de-implementación)

---

## 1. Visión general y posicionamiento

**Nombre del producto:** SportApp  
**Tagline principal:** *"La dirección técnica de tu club, en un solo lugar"*  
**Tagline alternativo:** *"Del Excel al control real. Gestiona tu club con la herramienta que tus entrenadores van a usar"*

**Para quién es:**
- Clubes deportivos de fútbol, fútbol sala, baloncesto, balonmano — cualquier deporte de equipo
- Clubes con **una o varias sedes** y múltiples equipos por categoría
- Directores técnicos, coordinadores, jefes de cantera
- Entrenadores que hoy gestionan todo por WhatsApp y hojas de Excel

**Qué es:**
SportApp es una plataforma web de gestión integral para clubes deportivos. Centraliza la planificación de sesiones de entrenamiento, la gestión de jugadores y entrenadores, la biblioteca de ejercicios, la documentación táctica y el control de accesos — todo conectado, todo en tiempo real, desde cualquier dispositivo.

---

## 2. Hero Section

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   [Logo SportApp]    [Características] [Precios] [Demo]  [Entrar]  │
│                                                                     │
│                                                                     │
│        Gestiona tu club como un equipo de élite.                   │
│                                                                     │
│   Planifica, organiza y comunica todo lo que pasa en               │
│   tus entrenamientos — sin hojas de cálculo, sin archivos         │
│   perdidos, sin WhatsApps eternos.                                 │
│                                                                     │
│      [ Solicitar demo gratuita ]   [ Ver cómo funciona ▶ ]        │
│                                                                     │
│   ─────────────────────────────────────────────────────────────   │
│   [Screenshot del Dashboard con calendario semanal + sidebar]      │
│   Vista real de la aplicación                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Copy del Hero:**

> ### Gestiona tu club como un equipo de élite.
>
> SportApp es la plataforma para clubes deportivos que conecta a tu director técnico, entrenadores y coordinadores en un solo espacio de trabajo. Planifica sesiones, gestiona plantillas, organiza documentación táctica y conoce en tiempo real qué está pasando en cada campo.
>
> **Sin hojas de cálculo. Sin archivos perdidos. Sin "¿dónde estaba ese ejercicio?"**

**Stats bar bajo el hero (cuando haya datos reales):**

| +500 sesiones planificadas | +40 equipos gestionados | +12 clubes activos | Disponible en iOS y Android |
|---|---|---|---|

---

## 3. El Problema que Resuelves

> *La mayoría de clubes deportivos gestionan equipos de 50, 100, 200 personas con las mismas herramientas que usa una frutería: WhatsApp, Excel y una carpeta de Drive que nadie organiza igual.*

### Sección "¿Te suena esto?"

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ¿Te suena esto?                                                │
│                                                                  │
│  😩  "¿Cuándo es el entrenamiento del sub-14 esta semana?"      │
│  😩  "El archivo de ejercicios lo tiene Marcos, pregúntale"     │
│  😩  "¿La sesión se canceló? No me enteré"                      │
│  😩  "No sé cuántos jugadores tiene la sede de Pozuelo"         │
│  😩  "El Excel del convenio lo sobreescribió alguien"           │
│  😩  "¿Por qué el entrenador no puede ver los vídeos tácticos?" │
│                                                                  │
│        Si asientes, SportApp es para tu club.                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Los 4 dolores reales

**1. Información dispersa y sin contexto**
Cada entrenador tiene su propio sistema. Los ejercicios están en el móvil de uno, los vídeos en el Drive de otro, la planificación en el Excel del coordinador. Nadie tiene el cuadro completo.

**2. Sin visibilidad para la dirección**
El director técnico no sabe qué pasó en el entrenamiento del martes. ¿Se realizó? ¿Hubo incidentes? ¿Qué notas dejó el entrenador? Con SportApp, esa información llega sola al dashboard.

**3. Gestión multi-sede imposible de escalar**
¿Tu club tiene sedes en distintos barrios o ciudades? Con Excel tienes un archivo por sede, versiones distintas y ningún control centralizado. SportApp nació multi-sede.

**4. Sin roles, sin control**
Un entrenador no debería ver la nómina, un jugador no debería editar ejercicios. Con hojas compartidas de Drive, el control de acceso es imposible.

---

## 4. Vista General de la Plataforma

### Sección: "Todo tu club, en una sola pantalla"

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  SIDEBAR IZQUIERDO          CONTENIDO PRINCIPAL                  │
│  ─────────────────          ────────────────────────────────     │
│  SportApp                   Panel de rendimiento                 │
│  ELITE MANAGEMENT           Sesiones del club ordenadas          │
│                             por fecha y hora                     │
│  > Dashboard  ◉             ┌────────────────────────────┐      │
│    Sedes                    │  ← 1–7 Jun 2026 →   [Hoy]  │      │
│    Equipos                  │  Lun Mar Mié [Jue] Vie Sáb  │      │
│    Entrenadores             │                             │      │
│    Jugadores                │  Sesiones (0)               │      │
│    Usuarios                 │  Jueves, 4 de Junio...      │      │
│    Ejercicios               └────────────────────────────┘      │
│    Sesiones                                                      │
│    Documentos                [Club Atlético Test ▾] [Mi sede ▾] │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Descripción para la landing:**

La barra lateral te da acceso inmediato a todos los módulos. En la cabecera, el selector de club y sede te permite cambiar de contexto en un clic — ideal si gestionas varias instalaciones desde una misma cuenta. El dashboard es tu centro de mando: un calendario semanal navegable con todas las sesiones del club, filtrable por sede, período y estado.

---

## 5. Módulos en Detalle

*Cada módulo se muestra como una tarjeta o sección con screenshot + descripción + ventaja clave.*

---

### 5.1 Dashboard — Centro de Mando del Director Técnico

**Screenshot:** `landing-screenshots/02-dashboard.png`

**Headline:** *"El director técnico ve todo. Siempre."*

El Dashboard es la primera pantalla que ve el admin al entrar. Muestra un **calendario semanal navegable** con todas las sesiones planificadas, realizadas o canceladas del club. Los filtros de sede, período y estado permiten aislar exactamente lo que importa.

**Lo que hace posible:**
- Ver de un vistazo qué sesiones hay esta semana en cada sede
- Navegar a semanas anteriores para revisar la actividad pasada
- Identificar sesiones con notas del entrenador (ver Sección 6)
- Cambiar entre clubs y sedes con un selector en la cabecera

---

### 5.2 Sedes — Tu Club, Organizado por Instalaciones

**Screenshot:** `landing-screenshots/05-sedes.png`

**Headline:** *"¿Varias instalaciones? Las gestionas todas desde aquí."*

Cada sede es una unidad autónoma dentro de tu club: tiene sus propios equipos, entrenadores, jugadores y documentos. El admin del workspace ve todas las sedes; cada responsable solo ve la suya.

**Ejemplo real de la app:** `canarias · lanzarote 3`, `Mi sede`, `Sede Norte (demo) · Madrid Norte`

**Lo que hace posible:**
- Crear y gestionar múltiples sedes bajo un mismo club
- Asignar responsables por sede con permisos específicos
- Ver acordeón expandible con equipos, entrenadores y jugadores por sede
- Invitar usuarios directamente a una sede concreta

---

### 5.3 Sesiones — Planificación de Entrenamiento Profesional

**Screenshot:** `landing-screenshots/03-sesiones.png`

**Headline:** *"Cada entrenamiento, documentado y conectado."*

Las sesiones son el núcleo de SportApp. Cada sesión tiene fecha, hora, duración estimada, equipo, uno o varios entrenadores asignados, microciclo, período de temporada, objetivo y notas. Se pueden crear una a una o **importar en bloque desde Excel**.

**Lo que hace posible:**
- Planificar toda la temporada de una vez (import bulk Excel)
- Asignar múltiples entrenadores a una misma sesión
- Adjuntar ejercicios de la biblioteca con orden, tiempo de ejecución y variante aplicada
- Adjuntar documentos (PDFs, vídeos, enlaces externos) a cada sesión
- Registrar feedback post-entreno visible en el dashboard del admin
- Estados: Borrador → Planificada → Realizada / No Realizada

---

### 5.4 Equipos — Plantillas Conectadas a Todo

**Screenshot:** `landing-screenshots/04-equipos.png`

**Headline:** *"Los equipos no son listas. Son el nodo central de tu estructura."*

Cada equipo pertenece a una sede y tiene asignados entrenadores y jugadores mediante relaciones muchos-a-muchos. Cuando planificas una sesión para el Sub-16 A, el sistema ya sabe qué entrenadores y jugadores forman parte de ese equipo.

**Lo que hace posible:**
- Asignar múltiples entrenadores y jugadores a un equipo
- Mover un equipo entre sedes
- Ver qué sesiones tiene planificadas un equipo
- Categorías por edad (`Sub-14`, `Sub-16`, `Sénior`, etc.)

---

### 5.5 Entrenadores y Jugadores — Fichas Completas

**Screenshots:** `landing-screenshots/11-entrenadores.png` / `landing-screenshots/12-jugadores.png`

**Headline:** *"Más que un nombre en una lista. Una ficha real."*

**Entrenadores:** nombre, apellidos, email, teléfono, fecha de nacimiento, titulación, foto, notas internas. Pueden estar en múltiples sedes y múltiples equipos. Pueden tener cuenta de acceso a la plataforma vinculada o ser solo un registro.

**Jugadores:** nombre, apellidos, dorsal, posición, pie dominante, foto, datos del tutor (para menores), notas. Igual que los entrenadores, multi-sede y multi-equipo.

**Lo que hace posible:**
- Tener el directorio completo del club, no esparcido por Excel
- Localizar a cualquier persona y ver a qué sedes y equipos pertenece
- Campos de tutor para categorías inferiores
- Notas privadas para el staff técnico

---

### 5.6 Ejercicios — La Biblioteca del Club

**Screenshot:** `landing-screenshots/06-ejercicios.png`

**Headline:** *"Para de buscar ejercicios en carpetas. Créalos una vez, úsalos siempre."*

La biblioteca de ejercicios es compartida por todo el club. Cada ejercicio tiene título, objetivo principal, número mínimo de jugadores, documentos adjuntos (vídeos, diagramas, PDFs) y puede ser propio de una sede o global para todo el workspace.

**Lo que hace posible:**
- Crear ejercicios una vez y reutilizarlos en cualquier sesión
- Adjuntar vídeos explicativos o diagramas a cada ejercicio
- Filtrar ejercicios por objetivo o sede
- Al planificar una sesión, seleccionar ejercicios de la biblioteca con orden y tiempo

---

### 5.7 Documentos — Todo el Material Táctico Centralizado

**Screenshot:** `landing-screenshots/07-documentos.png`

**Headline:** *"¿Dónde está el vídeo del último partido? En Documentos. Siempre."*

SportApp soporta dos tipos de documentos: **archivos subidos** (PDF, vídeo, imagen, lo que sea) y **enlaces externos** (YouTube, Vimeo, Google Drive, web). Cada documento tiene control de visibilidad granular: puede ser para todo el club, para una sede, para un equipo, o solo para ciertos entrenadores.

**Lo que hace posible:**
- Subir ficheros directamente a la plataforma (Supabase Storage, privado y seguro)
- Enlazar vídeos de YouTube o carpetas de Drive sin moverlos
- Controlar quién ve qué: no todos los entrenadores ven todos los documentos
- Adjuntar documentos a ejercicios y a sesiones específicas
- Categorías: Táctico, Fitness, Reglamento, etc.

---

### 5.8 Usuarios — Control de Acceso Real

**Screenshot:** `landing-screenshots/08-usuarios.png`

**Headline:** *"Cada persona, con los permisos que necesita y nada más."*

El sistema de usuarios gestiona quién puede entrar a la plataforma y qué puede hacer. La invitación es por email: el admin genera un enlace, el usuario se registra y queda automáticamente vinculado a la sede y rol correcto.

**Roles disponibles:**
- **Admin** — Acceso total al club
- **Gerente de Sede** — Gestiona su sede, no ve otras
- **Entrenador** — Planifica sesiones, accede a ejercicios y documentos
- **Jugador** — Acceso de consulta

---

### 5.9 Parámetros y Configuración

**Screenshots:** `landing-screenshots/09-parametros.png` / `landing-screenshots/10-configuracion.png`

**Headline:** *"Adapta SportApp a tu vocabulario."*

Los parámetros del sistema son las tablas maestras que alimentan los desplegables de toda la app: tipos de objetivo, tipos de contenido, materiales, categorías de edad. Los define el admin y se aplican en todo el club.

La Configuración incluye el gestor de invitaciones y las herramientas de **importación y exportación masiva en Excel**.

---

## 6. Feature Estrella: Notas de Sesión en Tiempo Real

> *Esta sección merece protagonismo especial en la landing. Es el diferencial más tangible y emocional.*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  🔔  NUEVO · La sesión tiene notas del entrenador                        │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Sub-16 A · Martes 3 Jun · 18:00h · Campo Norte                   │ │
│  │  Entrenador: Carlos Martínez                                       │ │
│  │  Estado: REALIZADA                                                 │ │
│  │                                                                    │ │
│  │  📝 NOTAS POST-ENTRENO:                                            │ │
│  │  "Sesión cancelada en el último momento por lluvia intensa.        │ │
│  │  Aprovechamos para hacer trabajo de vídeo en la sala. Los         │ │
│  │  chicos muy atentos. Ojo con Marcos (dorsal 7), lleva dos          │ │
│  │  semanas con molestias en el tobillo derecho, hablar con          │ │
│  │  el fisio antes del próximo partido."                             │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│       El director técnico lo ve en el dashboard en tiempo real.          │
│       Sin WhatsApp. Sin llamadas. Sin retrasos.                          │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Copy de la sección

**Headline:** *"El entrenador termina la sesión. Deja sus notas. El admin ya las ve."*

**Subtítulo:** *"Incidencias, lesiones, cancelaciones, observaciones tácticas. Todo queda registrado y visible para quien tiene que saberlo."*

**Cómo funciona:**

1. El entrenador termina una sesión de entrenamiento
2. Abre la sesión en SportApp y escribe sus notas en el campo **"Feedback post-entreno"**
3. Puede escribir lo que sea: *"cancelada por lluvia"*, *"el portero llegó tarde"*, *"buena sesión, mejorar el pressing"*, *"lesión de tobillo en el jugador 7"*
4. **El administrador y el director técnico ven en el Dashboard que esa sesión tiene notas** — aparece señalizada
5. Al abrir la sesión, toda la información está ahí: fecha, entrenador, ejercicios realizados, y las notas del entrenador

**¿Por qué importa?**

Con Excel o WhatsApp esto no existe. Las incidencias se quedan en el móvil del entrenador o en un grupo de chat donde se pierden entre GIFs. SportApp crea un registro permanente, vinculado a la sesión exacta, visible para la dirección.

**Casos de uso reales:**
- "Cancelada por lluvia · Recuperamos sesión el jueves"
- "Lesión de isquiotibial en el delantero centro · Revisar con el fisio"
- "El Sub-14 B necesita refuerzo en salida de balón · Ver vídeo adjunto"
- "Sesión muy buena · Plantilla lista para el partido del sábado"
- "Conflicto en el vestuario entre jugadores · Hablar con el coordinador"

---

## 7. SportApp vs Excel + Drive

> *Sección comparativa. Presentar como tabla o como tarjetas "Antes / Después".*

### Antes (Excel + Drive) vs Después (SportApp)

| Situación | Con Excel + Drive | Con SportApp |
|-----------|-------------------|--------------|
| Planificar la temporada | Un Excel por equipo, versiones mezcladas | Un calendario único para todo el club, importación bulk desde Excel |
| Ver qué pasó en un entrenamiento | Llamar al entrenador o buscar en el WhatsApp del grupo | Dashboard con notas del entrenador vinculadas a cada sesión |
| Buscar un ejercicio concreto | "¿Quién tiene el archivo? ¿En qué carpeta?" | Biblioteca central con buscador, filtros y documentos adjuntos |
| Saber si una sesión fue o no fue | No hay forma automática | Estado de sesión: Planificada / Realizada / No Realizada |
| Adjuntar un vídeo a un ejercicio | Enlace en una celda de Excel (que deja de funcionar) | Documento vinculado al ejercicio, siempre disponible |
| Dar acceso a un nuevo entrenador | Compartir carpeta de Drive con todos los archivos | Invitación por email, accede solo a lo que le corresponde |
| Gestionar varias sedes | Un Excel por sede, sin relación entre ellos | Multi-sede nativo, todo conectado bajo un workspace |
| Control de quién ve qué | Imposible con Drive compartido | Roles granulares: Admin, Gerente de Sede, Entrenador, Jugador |
| Incidencias de sesión | WhatsApp al grupo o llamada | Notas post-entreno visibles en el dashboard del admin |
| Importar datos existentes | Ya están en Excel — empezar desde cero | Importa tus Excel directamente: sedes, equipos, jugadores, sesiones |

### Sección "No eliminamos Excel. Lo superamos."

> SportApp incluye **importación y exportación nativa en formato Excel**. Si llevas años con tus datos en hojas de cálculo, no pierdes nada: importa todo de una vez y empieza a trabajar desde el minuto uno. Y si alguna vez necesitas exportar, tus datos siempre son tuyos.

**Ventajas concretas sobre tener todo en Excel + Drive:**

**Datos conectados, no duplicados**
En Excel, el nombre de un jugador aparece en 6 archivos distintos. En SportApp, existe una sola vez y se relaciona con sedes, equipos, sesiones y documentos. Cambias el dorsal en un sitio y ya está actualizado en todas partes.

**Historial permanente**
Una hoja de Excel sobreescrita pierde la historia. En SportApp cada sesión, cada nota, cada cambio queda registrado y vinculado. Puedes revisar qué pasó en el entrenamiento del 15 de octubre dentro de dos años.

**Acceso desde cualquier dispositivo**
El Excel solo está en el ordenador de quien lo creó. SportApp es una aplicación web: el entrenador escribe las notas desde su móvil en el vestuario, el director las lee desde casa en el iPad.

**Permisos reales**
Google Drive tiene "ver" o "editar". SportApp tiene 5 roles con control granular por módulo. El entrenador del Sub-14 no puede ver los documentos del primer equipo si no tiene acceso.

**Sin riesgo de pérdida**
Un archivo de Drive eliminado accidentalmente o una hoja sobreescrita puede ser catastrófico. SportApp usa base de datos PostgreSQL en Supabase con backups automáticos.

---

## 8. Diseño Multi-Sede

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│         WORKSPACE: Club Atlético ─────────────────────          │
│                         │                                       │
│         ┌───────────────┼───────────────┐                       │
│         │               │               │                       │
│    Sede Norte      Sede Centro      Sede Sur                    │
│    Madrid Norte    Centro Ciudad    Leganés                     │
│         │               │               │                       │
│    ┌────┤          ┌────┤          ┌────┤                       │
│    Sub-14          Sub-16          Sénior A                     │
│    Sub-16          Sénior B        Sénior B                     │
│    Sénior          Femenino                                     │
│                                                                  │
│   Cada sede tiene sus entrenadores, jugadores y documentos.     │
│   El director técnico ve TODO desde un solo dashboard.           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Headline:** *"Tres sedes, ocho equipos, cuarenta entrenadores. Un solo panel de control."*

**Descripción:**

SportApp nació para clubes que crecen. Si hoy tienes una sede y mañana abres otra, no necesitas una herramienta nueva — solo añades la sede al mismo workspace. Los entrenadores pueden pertenecer a varias sedes simultáneamente. Los documentos pueden ser globales del club o específicos de cada instalación. El director técnico siempre tiene la vista completa; cada responsable de sede ve solo lo suyo.

**Selector de contexto en la cabecera:**
El selector de Club + Sede en la barra superior permite cambiar de contexto en un clic. Si eres admin, ves todos los datos. Si eres gerente de la Sede Norte, solo ves la Sede Norte.

---

## 9. Roles y Permisos

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ROL              QUÉ PUEDE HACER                                      │
│  ─────────────    ───────────────────────────────────────────────      │
│  Admin            Todo: sedes, equipos, usuarios, parámetros,          │
│                   sesiones, ejercicios, documentos de todo el club     │
│                                                                        │
│  Gerente de Sede  Gestiona su sede: equipos, entrenadores,             │
│                   jugadores, sesiones — no ve otras sedes              │
│                                                                        │
│  Entrenador       Planifica y registra sesiones, accede a              │
│                   ejercicios y documentos según permisos               │
│                                                                        │
│  Jugador          Acceso de consulta: su equipo, su calendario         │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Cómo funciona la incorporación:**

1. El admin abre **Configuración → Invitar usuario**
2. Introduce el email de la persona y selecciona su rol
3. La persona recibe un email con un enlace personalizado
4. Al registrarse, queda automáticamente vinculada al workspace y a la sede correcta
5. Solo ve lo que le corresponde, desde el primer segundo

---

## 10. Sección de Videos Explicativos

> *Esta sección es clave para la conversión. Cada video debe ser corto (2-4 min), con pantalla capturada directamente de la app, narración en off y subtítulos. Ordenados de mayor a menor impacto para el decisor de compra.*

---

### VIDEO 1 — "Visión general: el dashboard del director técnico"
**Duración estimada:** 3 min  
**Audiencia:** Director técnico, coordinador, dueño del club

**Guión de lo que se muestra:**
```
00:00 — Pantalla de login. Se muestra la UI limpia y profesional.
00:10 — Login con email. Redirección al Dashboard.
00:20 — Se explica el calendario semanal: navegar entre semanas, 
        el selector de sede y el filtro de estado.
01:00 — Se crea una sesión de prueba: equipo Sub-16, jueves 18:00h,
        entrenador Carlos, objetivo "Presión tras pérdida".
01:45 — La sesión aparece en el calendario del dashboard.
02:00 — Se abre la sesión. Se muestra el campo de Feedback post-entreno.
        El entrenador escribe: "Sesión cancelada por lluvia.
        Los chicos hicieron trabajo de vídeo en sala. 
        Ojo con Marcos, tobillo derecho."
02:30 — Se guarda. En el dashboard, la sesión aparece señalizada con 
        indicador de "tiene notas".
02:50 — El admin abre la sesión desde el dashboard y lee las notas.
03:00 — FIN.
```

**Mensaje clave:** *"El entrenador escribe sus notas. El admin las ve al instante. Nada se pierde."*

---

### VIDEO 2 — "Planificación de temporada: del Excel a SportApp en minutos"
**Duración estimada:** 4 min  
**Audiencia:** Coordinador técnico, director de cantera

**Guión:**
```
00:00 — Se muestra un Excel típico de planificación: fechas, equipos,
        entrenadores, estados. Filas y filas de datos.
00:30 — Se abre Configuración → Importar. 
        Se sube el Excel. 
00:50 — La app muestra la vista previa: X sesiones encontradas,
        X equipos, X entrenadores. Validación automática.
01:30 — Clic en "Importar". Barra de progreso. 
        "120 sesiones importadas correctamente."
02:00 — Se va al dashboard. Las 120 sesiones están en el calendario.
02:30 — Se navega por el calendario semana a semana. 
        Se filtra por sede "Sede Norte". 
        Se filtra por estado "Planificada".
03:00 — Se abre una sesión importada y se le añade un ejercicio
        de la biblioteca.
03:30 — Se exporta de vuelta a Excel para mostrar que los datos
        siempre son del club.
04:00 — FIN.
```

**Mensaje clave:** *"No empieces desde cero. Importa lo que ya tienes."*

---

### VIDEO 3 — "La biblioteca de ejercicios: crea una vez, usa siempre"
**Duración estimada:** 3 min  
**Audiencia:** Entrenadores, coordinador técnico

**Guión:**
```
00:00 — Se abre Ejercicios. Biblioteca vacía de inicio.
00:15 — Se crea un ejercicio nuevo: "Rondo 4v1 en cuadrado".
        Objetivo: "Posesión bajo presión". Mínimo 5 jugadores.
00:45 — Se adjunta un vídeo de YouTube (enlace externo) al ejercicio.
01:00 — Se adjunta un PDF con el diagrama del ejercicio 
        (subida de archivo).
01:20 — El ejercicio está listo en la biblioteca.
01:30 — Se va a Sesiones → Nueva Sesión.
        Al planificar la sesión, se añade el ejercicio desde 
        la biblioteca: orden 1, duración 15 min, variante "4v2".
02:00 — Se muestra la sesión completa con el ejercicio adjunto
        y el vídeo accesible desde el detalle de sesión.
02:30 — Se muestra que otro entrenador (cambio de usuario)
        puede ver el mismo ejercicio desde su cuenta.
03:00 — FIN.
```

**Mensaje clave:** *"El conocimiento del club no vive en el móvil de un entrenador. Vive en SportApp."*

---

### VIDEO 4 — "Multi-sede: gestiona varias instalaciones desde un panel"
**Duración estimada:** 3 min  
**Audiencia:** Directores de clubes con varias sedes

**Guión:**
```
00:00 — Dashboard. En la cabecera se ve "Club Atlético Test / Mi sede".
00:15 — Se despliega el selector de Club: aparecen las sedes 
        disponibles (canarias, Mi sede, otra sede, Sede Norte).
00:30 — Se selecciona "Sede Norte". El dashboard actualiza
        mostrando solo las sesiones de esa sede.
01:00 — Se va a Sedes. Se muestran las 4 sedes creadas.
        Se expande "Sede Norte": muestra sus equipos, 
        entrenadores y jugadores.
01:30 — Se muestra cómo un mismo entrenador puede estar 
        en Sede Norte y en Sede Centro simultáneamente.
02:00 — Se crea una sesión para un equipo de Sede Norte.
        Solo los entrenadores de esa sede aparecen en el selector.
02:30 — Desde el admin, se cambia al selector "Todas las sedes":
        el dashboard muestra sesiones de todas las sedes juntas.
03:00 — FIN.
```

**Mensaje clave:** *"Crece sin límites. Añade sedes sin cambiar de herramienta."*

---

### VIDEO 5 — "Control de accesos: invita a tu equipo en 30 segundos"
**Duración estimada:** 2 min  
**Audiencia:** Admin del club, coordinador

**Guión:**
```
00:00 — Se abre Configuración → Invitar usuario.
00:10 — Se introduce el email del entrenador y se selecciona 
        rol "Entrenador" y sede "Sede Norte".
00:25 — Clic en "Generar invitación". 
        Aparece el link de invitación listo para copiar.
00:35 — Se muestra el email que recibe el entrenador 
        (si hay integración de email).
00:45 — El entrenador accede al link. Ve la pantalla de registro.
        Se registra con nombre y contraseña.
01:10 — El entrenador entra a la plataforma. 
        Solo ve: Sesiones, Ejercicios, Documentos de su sede.
        NO ve: Usuarios, Parámetros, otras sedes.
01:40 — Desde el admin, se ve al nuevo entrenador en la lista 
        de Usuarios con su rol asignado.
02:00 — FIN.
```

**Mensaje clave:** *"Sin formularios, sin configuraciones manuales. Una invitación, un clic."*

---

### VIDEO 6 — "Documentos: todo el material táctico en un lugar seguro"
**Duración estimada:** 2:30 min  
**Audiencia:** Entrenadores, coordinador técnico

**Guión:**
```
00:00 — Se abre Documentos. Se muestra la lista de documentos.
00:15 — Se crea un documento tipo "archivo": 
        se sube un PDF "Sistema defensivo 4-4-2".
        Categoría: Táctico. Visible para entrenadores: Sí.
00:45 — Se crea un documento tipo "enlace externo":
        se pega una URL de YouTube ("Análisis del rival").
        Se asigna solo al equipo Sub-16 A.
01:15 — Se adjunta el PDF a un ejercicio de presión alta 
        en la biblioteca.
01:30 — Se abre una sesión y se adjunta el vídeo de YouTube
        directamente como recurso de esa sesión.
01:50 — Se muestra la vista del entrenador: ve el vídeo de YouTube
        embebido en el detalle de la sesión, sin salir de la app.
02:20 — FIN.
```

**Mensaje clave:** *"El material táctico, organizado y accesible. Para siempre."*

---

### Layout de la sección de videos en la landing

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Aprende a usar SportApp en menos de 20 minutos                     │
│   ──────────────────────────────────────────────                     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ ▶ [thumbnail]   │  │ ▶ [thumbnail]   │  │ ▶ [thumbnail]   │     │
│  │                 │  │                 │  │                 │     │
│  │ El dashboard    │  │ Del Excel a     │  │ La biblioteca   │     │
│  │ del director    │  │ SportApp en     │  │ de ejercicios   │     │
│  │                 │  │ minutos         │  │                 │     │
│  │ 3 min           │  │ 4 min           │  │ 3 min           │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ ▶ [thumbnail]   │  │ ▶ [thumbnail]   │  │ ▶ [thumbnail]   │     │
│  │                 │  │                 │  │                 │     │
│  │ Gestión         │  │ Invita a tu     │  │ Documentos y    │     │
│  │ multi-sede      │  │ equipo          │  │ material        │     │
│  │                 │  │                 │  │ táctico         │     │
│  │ 3 min           │  │ 2 min           │  │ 2:30 min        │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 11. Testimonios / Social Proof

> *Sección para rellenar cuando haya usuarios reales. Mientras tanto, se pueden usar testimonios de beta-testers o casos de uso hipotéticos bien fundamentados.*

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  "Antes tardaba una hora en saber qué había pasado en los           │
│  entrenamientos de la semana. Ahora abro el dashboard               │
│  y en 5 minutos tengo el resumen completo."                         │
│                                                                      │
│  — Director Técnico, Club con 3 sedes y 8 equipos                  │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  "Por fin los ejercicios del club son del club, no del              │
│  móvil del entrenador que se fue hace dos temporadas."              │
│                                                                      │
│  — Coordinador de Cantera                                           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────      │
│                                                                      │
│  "Importamos dos temporadas de sesiones desde Excel en              │
│  menos de 10 minutos. Empezamos a trabajar ese mismo día."          │
│                                                                      │
│  — Administrador de Club, Madrid                                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 12. Precios

> *Sección placeholder. Rellenar con planes reales cuando estén definidos.*

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Elige el plan que se adapta a tu club                              │
│                                                                      │
│  ┌───────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │  STARTER      │  │  CLUB   ★ Popular │  │  PRO              │   │
│  │  ──────────   │  │  ──────────────   │  │  ──────────────   │   │
│  │  1 sede       │  │  Hasta 3 sedes    │  │  Sedes ilimitadas │   │
│  │  2 equipos    │  │  Equipos ilim.    │  │  Todo ilimitado   │   │
│  │  20 usuarios  │  │  50 usuarios      │  │  API + soporte    │   │
│  │               │  │                   │  │  prioritario      │   │
│  │  [Gratis      │  │  [29€/mes]        │  │  [Contactar]      │   │
│  │  30 días]     │  │                   │  │                   │   │
│  └───────────────┘  └───────────────────┘  └───────────────────┘   │
│                                                                      │
│   Todos los planes incluyen: import/export Excel, soporte por       │
│   email, actualizaciones incluidas, datos siempre exportables.      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. CTA Final

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   Tu club lleva demasiado tiempo funcionando con parches.            │
│                                                                      │
│   SportApp es la herramienta que tu cuerpo técnico necesita          │
│   y que tu dirección lleva años buscando.                            │
│                                                                      │
│        [ Solicitar demo gratuita ]   [ Crear cuenta ]               │
│                                                                      │
│   Sin tarjeta de crédito · Sin compromiso · Datos exportables        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Copy del CTA:**

> ### ¿Listo para ver tu club desde el control?
>
> Solicita una demo personalizada y te mostramos SportApp con los datos de tu club en menos de 30 minutos.
>
> O crea tu cuenta ahora y empieza con la prueba gratuita. Sin tarjeta. Sin compromiso. Con importación de tus datos Excel incluida desde el primer día.

---

## 14. Footer

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  SportApp                                                            │
│  Elite Management para clubes deportivos                             │
│                                                                      │
│  Producto        Empresa           Legal             Contacto        │
│  ─────────       ───────           ─────             ────────        │
│  Características  Acerca de        Privacidad        demo@sportapp   │
│  Precios          Blog             Términos          Twitter         │
│  Videos           Prensa           Cookies           LinkedIn        │
│  Changelog                                                           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  © 2026 SportApp. Todos los derechos reservados.                     │
│  Hecho con ☁️ Supabase · Desplegado en Vercel                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 15. Notas Técnicas de Implementación

### Stack recomendado para la landing

La landing puede implementarse dentro del mismo proyecto Next.js 16, creando una ruta pública `/` independiente del dashboard autenticado. Alternativamente, como sitio estático separado.

**Ruta sugerida dentro del proyecto:**
```
src/app/
├── page.tsx          ← Landing page (pública, ya existe)
├── login/            ← Login
├── (dashboard)/      ← Rutas autenticadas (separadas del marketing)
```

**Componentes sugeridos para la landing:**

```
src/components/landing/
├── HeroSection.tsx
├── ProblemSection.tsx
├── FeaturesSection.tsx
├── SessionNotesFeature.tsx    ← Feature estrella
├── ComparisonTable.tsx        ← vs Excel/Drive
├── MultiSedeSection.tsx
├── VideosSection.tsx
├── PricingSection.tsx
├── CtaSection.tsx
└── LandingNav.tsx
```

### Screenshots de la app para usar en la landing

Los screenshots capturados durante la exploración están en:
```
landing-screenshots/
├── 01-login.png          ← Login limpio y moderno
├── 02-dashboard.png      ← Dashboard con calendario semanal
├── 03-sesiones.png       ← Vista de sesiones
├── 04-equipos.png        ← Equipos
├── 05-sedes.png          ← Lista de sedes (con datos reales del demo)
├── 06-ejercicios.png     ← Biblioteca de ejercicios
├── 07-documentos.png     ← Documentos
├── 08-usuarios.png       ← Usuarios y roles
├── 09-parametros.png     ← Parámetros
├── 10-configuracion.png  ← Configuración e invitaciones
├── 11-entrenadores.png   ← Fichas de entrenadores
└── 12-jugadores.png      ← Fichas de jugadores
```

### Paleta de colores de la app (observado en screenshots)

- **Azul principal:** `#4F46E5` (botones primarios, elemento activo del sidebar)
- **Fondo:** `#FFFFFF` / `#F9FAFB` (gris muy claro para el layout)
- **Texto principal:** `#111827`
- **Texto secundario:** `#6B7280`
- **Acento destructivo:** rojo para botones "Eliminar"
- **Tipografía:** Sans-serif limpia (Inter o similar — confirmar con `font-family` en CSS)

### Consideraciones de copy

- El idioma de la UI es **español** — mantener español en toda la landing
- El nombre del producto es **SportApp** (con mayúscula S y A)
- El subtítulo visual del logo es "ELITE MANAGEMENT"
- Evitar jerga técnica (no hablar de "Supabase", "PostgreSQL", "RLS") en el copy de cara al usuario
- Los decisores son directores técnicos y coordinadores, no técnicos — hablar de problemas reales y resultados, no de arquitectura

### Grabación de los videos

Para grabar los 6 videos explicativos con datos reales:

1. Crear datos de demo realistas en Supabase (2-3 sedes, 4-6 equipos, 10-15 entrenadores, 30-40 jugadores, 20-30 sesiones de temporada real)
2. Usar cuenta de demo con rol admin para la grabación
3. Herramientas de grabación: Loom, OBS o QuickTime
4. Resolución: 1920×1080 mínimo
5. Narración en off, ritmo tranquilo, sin cortes bruscos
6. Subtítulos automáticos (YouTube, Descript)
7. Thumbnail con el frame más representativo de cada video

---

*Documento generado el 5 de junio de 2026. Basado en exploración completa de la aplicación SportApp (manage-sport-app) incluyendo todos los módulos, servicios, tipos, migraciones de base de datos y screenshots en vivo de la aplicación funcionando.*
