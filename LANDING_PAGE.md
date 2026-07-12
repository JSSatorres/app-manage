# SportApp · Landing Page — Diseño y copy de venta

> **Documento de diseño de la landing page de presentación de SportApp.**
> Sirve para dos cosas a la vez: (1) la **hoja de presentación para vender el proyecto** y (2) la **especificación de construcción** (estructura, copy, wireframes y sistema de diseño) para montarla en Next.js.
>
> Idioma de toda la UI y el copy: **español**. Marca: **SportApp · Elite Management**.

---

## 0. Resumen ejecutivo (el pitch en 30 segundos)

**SportApp es el sistema operativo del club deportivo.** Reemplaza el caos de tener las sedes en un Excel, los jugadores en otro, los entrenamientos en un Drive compartido y las cancelaciones en grupos de WhatsApp. Todo vive conectado: cuando un entrenador cierra una sesión y deja una nota — *"cancelada por lluvia"*, *"lesión de Martín en el minuto 30"* —, **el administrador lo ve al instante en su dashboard**, sin llamar a nadie.

Lo que en una hoja de cálculo son cinco pestañas que nadie mantiene sincronizadas, en SportApp es **un dato único que se actualiza solo** para todos los que tienen permiso para verlo.

**Una frase para la home:**
> **El club entero, en una sola pantalla. Deja el Excel y el Drive donde estaban: en el pasado.**

---

## 1. Sistema de diseño (tokens reales de la app)

La landing reutiliza la identidad visual del producto para que la transición *web → app* sea perfecta.

| Token | Valor | Uso |
|---|---|---|
| **Primario** | `#3358ff` (azul eléctrico) | CTAs, enlaces, acentos, logo |
| **Texto** | `#16181d` (casi negro) | Titulares y cuerpo |
| **Fondo** | `#ffffff` (blanco puro) | Base — estética minimalista |
| **Muted** | `#f6f7f9` / `#9498a1` | Secciones alternas, texto secundario |
| **Éxito** | `#10b981` (esmeralda) | Estado *Realizada*, métricas positivas |
| **Aviso** | `#f59e0b` (ámbar) | Estado *Borrador* |
| **Peligro** | `#ff5b52` (rojo) | Estado *No realizada*, cancelaciones |
| **Radio** | `0.75rem` base (hasta `2.2x`) | Tarjetas muy redondeadas |
| **Tipografía** | Geist Sans (`--font-sans`) | Titulares y cuerpo, tracking `-0.02em` |

**Logotipo:** icono **Zap (⚡)** en cuadrado redondeado azul `#3358ff` + wordmark "SportApp" y kicker "ELITE MANAGEMENT" en mayúsculas espaciadas.

**Tono visual:** minimalismo nórdico — mucho blanco, bordes finos `#ededf0`, sombras suaves, tarjetas `rounded-xl`, micro-animaciones con Framer Motion (las mismas que ya usa la app). Capturas de producto reales como protagonistas, no ilustraciones genéricas.

**Tono de voz del copy:** directo, profesional, sin jerga técnica. Hablamos al **director deportivo / dueño del club**, no al programador. Verbos de acción, frases cortas, beneficio antes que característica.

---

## 2. Estructura de la página (mapa de secciones)

```
┌──────────────────────────────────────────────────────┐
│  NAV         Logo · Funciones · Vídeos · Precios · [Entrar] [Probar gratis] │
├──────────────────────────────────────────────────────┤
│  1. HERO              Titular + captura del Dashboard  │
│  2. EL PROBLEMA       "Tu club vive en 7 pestañas"     │
│  3. LA SOLUCIÓN       Todo conectado (diagrama)        │
│  4. COMPARATIVA       SportApp vs Excel + Drive (tabla)│
│  5. RECORRIDO         9 módulos, sección por sección   │
│  6. FEATURE ESTRELLA  Actividad en tiempo real / notas │
│  7. MIGRACIÓN         "Importa tu Excel en un clic"    │
│  8. ROLES             Cada persona ve lo justo         │
│  9. VÍDEOS            Galería de tutoriales            │
│ 10. TESTIMONIOS       Prueba social                    │
│ 11. PRECIOS           Planes                           │
│ 12. FAQ               Dudas frecuentes                 │
│ 13. CTA FINAL         "Empieza hoy"                    │
│ 14. FOOTER                                             │
└──────────────────────────────────────────────────────┘
```

---

## 3. Sección 1 — HERO

**Objetivo:** en 5 segundos el visitante entiende qué es y por qué le cambia la vida.

**Wireframe:**

```
        ⚡ SportApp · ELITE MANAGEMENT

   Gestiona todo tu club deportivo
   desde una sola pantalla.

   Sedes, equipos, jugadores, entrenadores, sesiones y
   documentos — conectados de verdad. Cuando algo cambia,
   lo cambia para todos. Adiós a los Excel desactualizados.

   [  Probar gratis  ]   [ ▶ Ver cómo funciona (2 min) ]

   ★★★★★  Clubes que ya entrenan con cabeza

   ┌───────────────────────────────────────────────┐
   │   [ CAPTURA REAL DEL DASHBOARD SEMANAL ]       │
   │   Calendario · sesiones del día · estados      │
   │   con badge "No realizada · por lluvia"        │
   └───────────────────────────────────────────────┘
```

**Copy definitivo:**

- **Kicker:** `⚡ SportApp · ELITE MANAGEMENT`
- **H1:** **Gestiona todo tu club deportivo desde una sola pantalla.**
- **Subtítulo:** Sedes, equipos, jugadores, entrenadores, sesiones y documentos — conectados de verdad. Cuando algo cambia, se actualiza para todos. Adiós a los Excel que nadie sabe cuál es el bueno.
- **CTA primario:** `Probar gratis` (botón azul `#3358ff`)
- **CTA secundario:** `▶ Ver cómo funciona (2 min)` (abre el vídeo overview de la sección 9)
- **Prueba social inline:** `Clubes de fútbol, baloncesto y academias multideporte ya entrenan con SportApp`

**Imagen hero:** captura real del **Dashboard semanal** (el `DashboardPage`): navegación por semanas, selector de días con contador de sesiones, lista del día y los badges de estado de colores (*Realizada* verde, *Planificada* azul, *Borrador* ámbar, *No realizada* rojo). Esta captura ya **cuenta la historia entera** del producto.

---

## 4. Sección 2 — EL PROBLEMA (con el que el visitante se identifica)

**Titular:** **Tu club no vive en una herramienta. Vive en siete.**

Tres columnas con el dolor real:

| 📊 El Excel zombie | 📁 El Drive caótico | 💬 El WhatsApp infinito |
|---|---|---|
| "Jugadores_v3_FINAL_BUENO.xlsx". Nadie sabe cuál es la versión buena. Cambias un dorsal y se desincroniza de la plantilla del equipo. | Carpetas dentro de carpetas. Los ejercicios en PDF que solo encuentra quien los subió. El vídeo de la jugada que se perdió en "Sin título (3)". | "¿Quién cubre el entreno del sábado?", "se ha cancelado por lluvia", "¿alguien tiene la ficha de Martín?". La información se evapora al hacer scroll. |

**Cierre de sección (frase puente):**
> Cada herramienta funciona sola. El problema es que **tu club no funciona en piezas sueltas.** Un jugador pertenece a un equipo, que entrena en una sede, en una sesión que tiene ejercicios y la cubre un entrenador. Si eso no está conectado, **alguien acaba copiando datos a mano.** Y donde se copia a mano, se equivoca.

---

## 5. Sección 3 — LA SOLUCIÓN (el dato único y conectado)

**Titular:** **Un solo sitio. Todo conectado. Se actualiza solo.**

**Subtítulo:** En SportApp no hay copias. Hay **un dato vivo** que cada persona ve según su rol. Cambias el nombre de una sede una vez y cambia en los equipos, las sesiones, los documentos y los informes. Como debe ser.

**Diagrama de relaciones (renderizar como grafo animado):**

```
                    🏢 WORKSPACE (tu club)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          🏟️ SEDE A       🏟️ SEDE B       🏟️ SEDE C
              │
        ┌─────┴─────┐
        │           │
    🛡️ EQUIPO     🛡️ EQUIPO
        │   \        │
        │    \       │
   👤 JUGADORES   📋 ENTRENADORES
        │              │
        └──────┬───────┘
               │
        📅 SESIÓN (fecha · hora · objetivo · estado)
          │         │
     🏋️ EJERCICIOS  📝 NOTAS POST-ENTRENO
          │
     📄 DOCUMENTOS (PDF, vídeo, enlaces de Drive/YouTube)
```

**Tres bloques de beneficio bajo el diagrama:**

1. **Cambia una vez, cambia en todo.** Renombras una sede, mueves un jugador de equipo o actualizas la titulación de un entrenador — y toda la app lo refleja al instante. Cero copia-pega.
2. **Nada se pierde de contexto.** Un ejercicio sabe a qué sesiones pertenece. Una sesión sabe qué equipo, qué entrenador y qué documentos lleva. Haces clic y tienes la historia completa.
3. **Cada quien ve lo suyo.** El dato es único, pero la vista es personal: el dueño ve todas las sedes; el gerente, la suya; el entrenador, sus equipos.

---

## 6. Sección 4 — COMPARATIVA: la ventaja de estar conectado vs. Excel + Drive

> **Este es el corazón del argumento de venta.** Aquí demostramos, fila por fila, por qué un sistema conectado gana a "una tabla de Excel + un documento de Drive".

**Titular:** **Lo que un Excel y un Drive nunca podrán hacer.**

| Lo que necesitas hacer | 📊 Excel + 📁 Drive | ⚡ SportApp |
|---|---|---|
| **Mover un jugador de equipo** | Lo borras de una pestaña, lo pegas en otra y rezas por no equivocarte de fila | Lo arrastras una vez; su ficha, su equipo y sus sesiones se actualizan solas |
| **Saber qué pasó en el entreno del sábado** | Preguntas por WhatsApp y esperas | Lo lees en el dashboard: estado + nota del entrenador, al instante |
| **Una cancelación por lluvia** | Un mensaje que se pierde en el grupo | Estado *No realizada* + motivo, visible en el panel del admin y registrado para siempre |
| **Encontrar el vídeo de un ejercicio** | "¿En qué carpeta estaba?" | Está adjunto al ejercicio y a la sesión donde se usó. Un clic |
| **Permisos por persona** | Compartes el Drive entero o nada | Cada rol ve y edita solo lo que le toca (5 niveles) |
| **Quién puede tocar qué** | Cualquiera con el enlace edita y borra filas | Matriz de permisos por recurso: ver vs. modificar |
| **Datos al día** | Tantas versiones como personas | Un único dato vivo, siempre el bueno |
| **Trabajar desde el móvil en el campo** | Excel en el móvil es una tortura | App responsive con navegación inferior pensada para el móvil |
| **Buscar la ficha de un jugador** | Ctrl+F en 300 filas | Búsqueda y filtros por sede, equipo, posición, estado |
| **Empezar con tus datos actuales** | — | **Importas tu propio Excel tal cual y SportApp lo conecta solo** (ver §8) |
| **Traer una hoja que vive en Google** | La abres y la sigues editando suelta | Pegas el enlace de tu **Google Sheets/Drive** y SportApp la importa y la conecta |
| **Planificar un mes de entrenamientos** | 30 filas copiadas a mano | Eliges rango de fechas + días de la semana y se generan todas de golpe |

**Frase de cierre (callout destacado):**
> Excel y Drive son geniales para **guardar** datos. SportApp es para **operar** un club. La diferencia es la misma que entre una libreta y un copiloto.

> 💡 **Y lo mejor:** no tienes que elegir. SportApp **lee tu Excel** para empezar y **conecta tus archivos de Drive y enlaces de YouTube** como documentos. Te llevas lo bueno de tus herramientas y dejas atrás el caos.

---

## 7. Sección 5 — RECORRIDO POR LOS MÓDULOS (sección por sección)

> Bloque tipo "feature tour". Cada módulo: **icono + nombre + qué resuelve + a qué se conecta**. Acompañar cada uno de una captura real y, donde aplique, enlazar a su vídeo (§9).
>
> Cada tarjeta lleva una etiqueta **↔ Conecta con:** que es justo lo que un Excel no tiene.

### 5.1 📊 Dashboard — "El pulso del club"
La pantalla de inicio. Vista semanal de todas las sesiones con mini-calendario mensual, contador de sesiones por día y **filtros por sede, periodo de temporada y estado**. Haces clic en una sesión y ves su ficha completa sin cambiar de página.
**↔ Conecta con:** sesiones, equipos, sedes y las notas del entrenador. *Es el cristal por el que se ve todo lo demás.*

### 5.2 🏟️ Sedes — "Tus centros, ordenados"
Da de alta cada centro/instalación del club. Toda la actividad (equipos, sesiones, ejercicios, documentos) cuelga de una sede.
**↔ Conecta con:** equipos, entrenadores, jugadores, ejercicios y documentos. Cambia el nombre aquí y cambia en todas partes.

### 5.3 🛡️ Equipos — "La plantilla viva"
Equipos con categoría y sede. Asignas entrenadores y jugadores con un selector múltiple — sin duplicar a nadie.
**↔ Conecta con:** jugadores y entrenadores (muchos-a-muchos), sede y sesiones.

### 5.4 📋 Entrenadores — "El cuerpo técnico"
Fichas con titulación, contacto, fecha de nacimiento y notas. **Un entrenador puede pertenecer a varias sedes y varios equipos** a la vez.
**↔ Conecta con:** equipos, sedes y las sesiones que dirige (y firma con sus notas).

### 5.5 👤 Jugadores — "La ficha que no se pierde"
Dorsal, posición, pie dominante, datos del tutor (clave en categorías base), contacto y notas. Multi-sede y multi-equipo.
**↔ Conecta con:** equipos y sedes. Su historial deja de vivir en una fila de Excel.

### 5.6 👥 Usuarios — "Quién entra y con qué permisos"
Invitas a tu equipo por email y le asignas un rol. Gestión de accesos centralizada.
**↔ Conecta con:** la matriz de roles y las fichas de entrenador/jugador (vinculación de cuenta).

### 5.7 🏋️ Ejercicios — "Tu biblioteca de entrenamiento"
Catálogo de ejercicios con objetivo principal y nº mínimo de jugadores. Cada uno puede ser **global del club** o **propio de una sede**, y lleva documentos adjuntos (PDF, vídeos, enlaces).
**↔ Conecta con:** sesiones (se montan a partir de ejercicios) y documentos.

### 5.8 📅 Sesiones — "El entrenamiento, de la idea al informe"
El módulo central. Planificas: fecha, hora, duración, equipo, entrenador(es), microciclo, periodo de temporada, objetivo y observaciones previas. Cada sesión avanza por estados:

`Borrador` → `Planificada` → `Realizada` / `No realizada`

Y al terminar, el entrenador deja su **feedback post-entreno**. Montas la sesión a partir de tu biblioteca de ejercicios (con tiempos de ejecución, descanso y variante aplicada) y le adjuntas documentos.

> 🗓️ **Programación en lote (verificado en producto):** no creas las sesiones una a una. Eliges un rango **Desde / Hasta** y marcas los **días de la semana** (Lun–Dom), y SportApp genera todos los entrenamientos del periodo de golpe. Un mes de planificación en diez segundos — algo impensable copiando filas en un Excel.

**↔ Conecta con:** equipos, entrenadores, ejercicios, documentos y el dashboard del admin. *Aquí nace la feature estrella (§6).*

### 5.9 📄 Documentos — "El Drive, pero con sentido"
Sube archivos (van a almacenamiento seguro) **o** enlaza recursos externos: un vídeo de **YouTube/Vimeo**, una web o un archivo de **Google Drive**. Categorízalos y decide su visibilidad: todos los entrenadores o solo algunos. Asócialos a sedes, equipos, ejercicios o sesiones.
**↔ Conecta con:** todo. Un documento siempre sabe a qué pertenece — el opuesto exacto de una carpeta perdida.

### 5.10 ⚙️ Parámetros (admin) — "Tu club, a tu medida"
Configura los desplegables del sistema: tipos de objetivo, tipos de contenido, material, categorías de edad. La app se adapta a tu vocabulario, no al revés.

---

## 8. Sección 6 — FEATURE ESTRELLA: Actividad en tiempo real

> 🎯 **El "momento mágico" de la demo.** Esta sección merece su propio bloque a pantalla completa, con animación. Es la respuesta tangible a "¿por qué no un Excel?".

**Titular:** **El entrenador anota. El director se entera. Sin una sola llamada.**

**Subtítulo:** Cuando un entrenamiento termina, el entrenador deja sus notas en la sesión desde el campo. En ese instante, esa nota **viaja al dashboard del administrador** y queda registrada para siempre. Lo que pasó en el césped deja de evaporarse.

**Narrativa visual (split-screen animado):**

```
  📱 LADO ENTRENADOR (en el campo)        🖥️ LADO ADMIN (en la oficina)
  ┌─────────────────────────────┐        ┌──────────────────────────────┐
  │ Sesión · Infantil A          │        │  Dashboard — Hoy             │
  │ Estado: [ No realizada ▼ ]   │  ───▶  │  ┌────────────────────────┐  │
  │                              │        │  │ 18:00 Infantil A       │  │
  │ Notas del entrenador:        │        │  │ 🔴 No realizada        │  │
  │ "Cancelada por lluvia.       │        │  │ "Cancelada por lluvia" │  │
  │  Recuperamos el jueves."     │        │  └────────────────────────┘  │
  │ [ Guardar notas ]            │        │   ↑ aparece al instante      │
  └─────────────────────────────┘        └──────────────────────────────┘
```

**Ejemplos de actividad que el admin ve aparecer en su panel (carrusel de tarjetas):**

- 🔴 **No realizada** — *"Cancelada por lluvia. Campo encharcado, recuperamos el jueves."*
- 🟠 **Incidencia** — *"Lesión de Martín en el minuto 30, tobillo. Avisado el fisio."*
- 🟢 **Realizada** — *"Gran intensidad. El bloque de transiciones funcionó muy bien."*
- 🔵 **Cambio de plan** — *"Sesión adaptada: solo vinieron 8 jugadores, trabajamos rondos."*
- 🟡 **Pendiente** — *"Falta material: faltan 4 conos y dos petos. Comprar antes del sábado."*

**Tres beneficios:**
1. **Trazabilidad total.** Cada sesión guarda qué pasó, por qué y quién lo anotó. El histórico del club, escrito solo.
2. **Decisiones con datos.** ¿Cuántas sesiones se caen por lluvia en esta sede? ¿Qué equipo acumula incidencias? Ya no es una sensación: es un dato.
3. **Cero teléfono roto.** La nota la escribe quien estuvo allí y la lee quien decide. Sin intermediarios, sin "me dijeron que…".

**Callout de cierre:**
> En un Excel, esto sería una celda que alguien tiene que acordarse de rellenar, en una pestaña que alguien tiene que acordarse de abrir. En SportApp, **es el flujo natural de cerrar un entrenamiento** — y llega solo a quien tiene que verlo.

> *Nota de producto: el motor de notas y estados de sesión (`feedback post-entreno`, estados `Realizada` / `No realizada`) ya es la columna vertebral del módulo de sesiones y del dashboard; la capa de **feed de actividad y avisos en tiempo real** es la evolución natural sobre esa base.*

---

## 9. Sección 7 — MIGRACIÓN: "Importa tu Excel en un clic"

> Quita el mayor miedo del comprador: *"tendré que meter todo a mano otra vez"*. **No.**

**Titular:** **Ya tienes tus datos en un Excel. Tráelos tal cual.**

**Subtítulo:** SportApp **lee tu hoja de cálculo** — la tuya, con tus nombres de columna — y lo conecta todo automáticamente. No tienes que aprender un formato nuevo ni renombrar nada.

**Cómo funciona (3 pasos ilustrados):**

```
   1. SUBE              2. SPORTAPP ENTIENDE        3. LISTO Y CONECTADO
   ┌──────────┐         ┌────────────────────┐      ┌──────────────────┐
   │ tu_club  │   ──▶   │ Reconoce columnas   │ ──▶  │ Sedes, equipos,  │
   │ .xlsx    │         │ aunque las llames   │      │ jugadores, etc.  │
   │          │         │ distinto. Vincula   │      │ ya enlazados     │
   └──────────┘         │ por nombre.         │      │ entre sí.        │
                        └────────────────────┘      └──────────────────┘
```

**Lo que lo hace sentir mágico (puntos de venta):**

- **Reconoce tus encabezados aunque no coincidan.** ¿Pusiste "Teléfono", "Móvil" o "Tel."? ¿"Coach" en vez de "Entrenador"? Lo entiende igual: normaliza acentos, mayúsculas y sinónimos.
- **Conecta por nombre, no por código.** Escribes "Sede Norte" en la pestaña de equipos y SportApp lo vincula a la sede real. Nada de IDs ni UUIDs.
- **Respeta el orden de dependencias.** Crea primero las sedes, luego los equipos, luego jugadores y entrenadores, y al final las sesiones — solo. Tú no piensas en eso.
- **No duplica.** Si vuelves a importar, omite lo que ya existe. Puedes reimportar sin miedo.
- **Te da un parte claro.** Al terminar ves cuántos registros se crearon, cuántos se omitieron y exactamente en qué fila hubo un problema.
- **Plantilla lista para usar.** ¿Empiezas de cero? Descarga la plantilla con todas las pestañas y los encabezados correctos.
- **Importa pegando el enlace de tu Google Sheets o Drive.** ¿Tu plantilla vive en Google? No la descargues: **pega la URL** de tu Google Sheets o de tu archivo de Drive y SportApp lo trae solo (basta con que esté compartido como "cualquiera con el enlace"). El puente directo entre tu Drive y un club conectado.

**Y al revés — Exporta cuando quieras:**
> Tus datos son tuyos. Exporta todo el club a un Excel con **un clic**, con los nombres legibles (no códigos), listo para imprimir, compartir o archivar. **Sin lock-in.** Entras y sales con tu Excel cuando te dé la gana.

**Callout:**
> La migración no es un trámite: es la primera prueba de que SportApp respeta cómo ya trabajas. Tu Excel entra por una puerta y sale, al otro lado, convertido en un club que funciona conectado.

---

## 10. Sección 8 — ROLES: cada persona ve lo justo

**Titular:** **Cinco roles. Cada uno ve y toca solo lo suyo.**

**Subtítulo:** Compartir un Drive es todo o nada. SportApp da a cada persona exactamente el acceso que necesita — ni más (riesgo) ni menos (fricción).

| Rol | Qué puede hacer |
|---|---|
| 👑 **Super Admin** | Control total de todo el club y todas las sedes. |
| 🧭 **Admin (dueño del club)** | Gestiona el club entero: sedes, usuarios, parámetros y configuración. |
| 🏟️ **Gerente de sede** | Manda en su sede: equipos, entrenadores, jugadores, sesiones y documentos de su centro. |
| 📋 **Entrenador** | Su día a día: ve sus equipos y jugadores, crea y cierra sesiones, monta ejercicios y deja notas. |
| 👤 **Jugador** | Acceso pensado para consulta (su información), fuera del panel de gestión. |

**Detalle que vende (callout):**
> Los permisos distinguen entre **ver** y **modificar**. Un entrenador puede consultar el dashboard pero no toca la facturación. Un gerente gestiona su sede pero no las ajenas. Todo desde **una única matriz de permisos** — sin hojas compartidas a medias ni sustos de "¿quién borró esta fila?".

---

## 11. Sección 9 — VÍDEOS EXPLICATIVOS (galería de tutoriales)

> 🎬 **Sección clave pedida para la venta.** Una galería donde el visitante *ve cómo se hace cada cosa y cómo se ve* la app de verdad. Cada vídeo: thumbnail con play, título, duración y una frase de qué resuelve. El primero (overview) es el que abre el CTA del hero.
>
> Layout sugerido: vídeo destacado grande arriba + rejilla de 3 columnas debajo. Reproductor embebido (los propios documentos de tipo enlace de SportApp ya soportan YouTube/Vimeo, así que el reproductor es coherente con el producto).

**Titular de sección:** **Míralo funcionando. 2 minutos y lo entiendes todo.**

### 🎥 Vídeo destacado (overview) — *"SportApp en 2 minutos"* · 2:10
Recorrido relámpago: del Excel caótico al club conectado. Termina en el momento estrella — la nota de "cancelada por lluvia" apareciendo en el dashboard del admin. **Este es el vídeo del botón del hero.**

### Rejilla de tutoriales

| # | Vídeo | Dur. | Qué se ve |
|---|---|---|---|
| 1 | **Crea tu club en 60 segundos** | 1:00 | Onboarding: alta del workspace, primera sede, invitar al equipo. |
| 2 | **Importa tu Excel y míralo conectarse solo** | 2:30 | Subes tu `.xlsx`, SportApp reconoce las columnas y crea sedes, equipos y jugadores enlazados. El "antes/después". |
| 3 | **Monta una sesión de entrenamiento** | 2:00 | De `Borrador` a `Planificada`: eliges equipo, entrenador, objetivo y arrastras ejercicios desde la biblioteca. |
| 4 | **El entrenador cierra la sesión y deja notas** ⭐ | 1:30 | Desde el móvil, en el campo: marcar `No realizada`, escribir "cancelada por lluvia" y guardar. |
| 5 | **Cómo el admin ve la actividad en su dashboard** ⭐ | 1:20 | El otro lado de la historia: la nota y el estado aparecen en el panel; filtros por sede, periodo y estado. |
| 6 | **Biblioteca de ejercicios con vídeos** | 1:45 | Crear un ejercicio, adjuntar un PDF y un enlace de YouTube, marcarlo como global o de sede. |
| 7 | **Documentos: archivos, Drive y enlaces** | 1:40 | Subir un PDF, enlazar un Drive/YouTube, categorizar y elegir qué entrenadores lo ven. |
| 8 | **Fichas de jugador y equipo** | 1:30 | Dorsal, posición, tutor; mover un jugador de equipo y ver que todo se actualiza solo. |
| 9 | **Roles y permisos en acción** | 1:25 | La misma pantalla vista por un admin, un gerente y un entrenador. Quién ve qué. |
| 10 | **Exporta todo tu club a Excel** | 0:50 | Un clic, descarga con nombres legibles. "Sin lock-in". |

> **Guion recurrente de cada vídeo (para producción):** *(1)* el problema en 1 frase → *(2)* se hace en la app, en pantalla real → *(3)* se muestra el efecto conectado en otra parte de la app ("…y mira, aquí también cambió solo"). Ese tercer paso es el que vende en cada vídeo.

---

## 12. Sección 10 — TESTIMONIOS (prueba social)

**Titular:** **Clubes que ya dejaron el Excel atrás.**

Tres tarjetas (rellenar con casos reales cuando los haya):

> ⭐⭐⭐⭐⭐
> *"Teníamos 4 categorías en 4 Excel distintos. Ahora es una sola pantalla y, cuando un entrenador cancela por lluvia, me entero en el momento. No vuelvo atrás."*
> — **[Nombre]**, Director deportivo · [Club]

> ⭐⭐⭐⭐⭐
> *"Importé nuestra hoja de jugadores de tres temporadas y lo conectó todo solo. Pensé que tardaría una semana en migrar; fueron diez minutos."*
> — **[Nombre]**, Coordinador · [Academia]

> ⭐⭐⭐⭐⭐
> *"Mis entrenadores dejan las notas desde el campo con el móvil. Por fin sé qué pasa en cada entrenamiento sin perseguir a nadie."*
> — **[Nombre]**, Gerente de sede · [Club]

**Banda de logos:** *"Confían en SportApp"* + escudos de clubes (placeholder).

---

## 13. Sección 11 — PRECIOS

**Titular:** **Precio simple. Sin sorpresas.**
**Subtítulo:** Empieza gratis. Crece cuando tu club crezca.

| 🌱 Club | 🚀 Multi-sede | 🏆 Federación |
|---|---|---|
| Para un club de una sede | Para clubes con varios centros | Para grupos y federaciones |
| 1 sede · equipos ilimitados | Sedes ilimitadas | Todo lo del plan Multi-sede |
| Jugadores y entrenadores ilimitados | Roles avanzados (gerente de sede) | Soporte dedicado + onboarding |
| Importación de Excel | Actividad en tiempo real | Personalización y SLA |
| Documentos y enlaces | Exportación e informes | Integraciones a medida |
| **Gratis para empezar** | **[Precio] /mes** | **A medida** |
| [ Empezar gratis ] | [ Probar 14 días ] | [ Hablar con ventas ] |

> Microcopy bajo la tabla: *Sin tarjeta para empezar. Cancela cuando quieras. Tus datos salen en Excel cuando los quieras — sin candados.*

---

## 14. Sección 12 — FAQ

**¿Tengo que meter todos mis datos a mano?**
No. Subes tu Excel actual y SportApp reconoce las columnas (aunque las llames distinto) y lo conecta todo. También hay plantilla si empiezas de cero.

**¿Puedo sacar mis datos cuando quiera?**
Sí. Exportas todo el club a Excel con un clic, con nombres legibles. Sin lock-in.

**¿Sirve para mi deporte?**
SportApp es agnóstico al deporte: fútbol, baloncesto, balonmano, academias multideporte… Tú configuras las categorías, posiciones y parámetros.

**¿Funciona en el móvil?**
Sí, está pensada para usarse en el campo: navegación inferior en móvil y todo accesible desde el teléfono del entrenador.

**¿Cómo controlo quién ve qué?**
Con cinco roles y una matriz de permisos que distingue ver de modificar. Cada persona accede solo a lo suyo.

**¿Dónde están mis archivos?**
Donde quieras: súbelos a almacenamiento seguro de SportApp o enlaza tus recursos de Google Drive, YouTube o Vimeo. La app los mantiene asociados a su sede, equipo, ejercicio o sesión.

**¿Y si un entrenamiento se cancela?**
El entrenador lo marca como *No realizada* y deja el motivo (lluvia, lesión, falta de jugadores…). Aparece en el dashboard del admin y queda registrado en el histórico del club.

---

## 15. Sección 13 — CTA FINAL

```
        ┌───────────────────────────────────────────┐
        │                                           │
        │   Tu club merece algo mejor que un Excel. │
        │                                           │
        │   Empieza gratis hoy. Trae tu hoja de     │
        │   cálculo y míralo conectarse solo.       │
        │                                           │
        │   [  Probar gratis  ]   [ Ver una demo ]  │
        │                                           │
        │   Sin tarjeta · Importación incluida      │
        └───────────────────────────────────────────┘
```

- **H2:** **Tu club merece algo mejor que un Excel.**
- **Sub:** Empieza gratis hoy. Trae tu hoja de cálculo y míralo conectarse solo.
- **CTA primario:** `Probar gratis` · **CTA secundario:** `Ver una demo`
- **Microcopy:** *Sin tarjeta · Importación de tu Excel incluida · Cancela cuando quieras*

---

## 16. Sección 14 — FOOTER

```
⚡ SportApp · ELITE MANAGEMENT

Producto            Recursos           Empresa            Legal
· Funciones         · Vídeos           · Sobre nosotros   · Privacidad
· Precios           · Guía de migración· Contacto         · Términos
· Roadmap           · Centro de ayuda  · Blog             · Cookies
· Novedades         · Estado del servicio

                © SportApp — Gestión integral para clubes deportivos
```

---

## 17. Notas de implementación (para quien la monte)

- **Stack coherente con la app:** Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui + Framer Motion. Reutiliza los tokens de `globals.css` (§1) para identidad pixel-perfect con el producto.
- **Capturas reales > mockups.** Usar pantallas verdaderas: Dashboard semanal, `SesionDetalleDialog` (con el campo "Notas del entrenador"), vista de Documentos con tipo *enlace*, y el diálogo de importación con su parte de resultados.
- **Animación del momento estrella (§8):** el split-screen entrenador↔admin debe ejecutarse al hacer scroll (intersection observer) — es el gancho. Que la tarjeta "🔴 No realizada · cancelada por lluvia" *aparezca* en el lado admin con un fade-in.
- **Rendimiento y SEO:** `next/image` para todas las capturas (la app lo exige por norma), lazy-load de la galería de vídeos, metadatos y Open Graph con la captura del dashboard.
- **Accesibilidad:** contraste AA (el azul `#3358ff` sobre blanco cumple), foco visible, vídeos con subtítulos en español.
- **Responsive:** la landing debe verse impecable en móvil (375px) — coherente con que la app presume de uso en el campo.
- **CTAs → producto:** "Probar gratis" lleva a `/register`; "Entrar" a `/login`. Cierra el círculo web → app.

---

### Apéndice A — Capturas reales del producto (assets listos)

Capturas tomadas **en vivo** de la app (carpeta [`landing-assets/`](landing-assets/)), con un **club demo sembrado** (Club Atlético Test: 2 sedes, 4 equipos, 3 entrenadores, 8 jugadores, 9 sesiones repartidas en la semana). Listas para la landing y los thumbnails de los vídeos:

| Archivo | Qué muestra | Dónde usarlo |
|---|---|---|
| `01-dashboard.png` | Dashboard semanal **con datos**: días con contador y sesiones de hoy con badges **rojo "No realizada"** + verde "Realizada" | Hero (§3) |
| `09-sesion-nota-lluvia.png` | ⭐ Detalle de sesión con badge **rojo "No realizada"** y la **nota del entrenador "Cancelada por lluvia…"** — la feature estrella (§6) | Feature estrella (§6) · Vídeo 4/5 |
| `02-nueva-sesion.png` | Formulario de sesión con **programación recurrente** y ejercicios | Módulo Sesiones (§7) · Vídeo 3 |
| `12-sesiones.png` | Lista de 9 sesiones con estados, equipo y entrenadores | Sesiones (§7) · Vídeo 3 |
| `15-ejercicios.png` | Biblioteca de 5 ejercicios (globales + de sede) | Ejercicios (§7) · Vídeo 6 |
| `10-jugadores.png` | 7 jugadores con dorsal, posición, sede y equipos | Jugadores (§7) · Vídeo 8 |
| `11-equipos.png` | Equipos por categoría y sede | Equipos (§7) · Vídeo 8 |
| `14-entrenadores.png` | Cuerpo técnico con titulación y datos | Entrenadores (§7) |
| `13-sedes.png` | Las 2 sedes del club | Sedes (§7) |
| `03-export-excel.png` | Pestaña **Exportar a Excel** | Migración (§9) · Vídeo 10 |
| `04-import-excel-drive.png` | **Importar**: archivo + URL de Google Sheets/Drive + plantilla | Migración (§9) · Vídeo 2 |
| `05-documentos.png` | Tabla de documentos (tipo, categoría, tamaño, sedes) | Documentos (§7) · Vídeo 7 |
| `06-doc-archivo.png` | Alta de documento tipo **Archivo** + visibilidad por entrenador | Documentos (§7) |
| `07-doc-enlace.png` | Alta de documento tipo **Enlace** (YouTube/Vimeo/Drive/web) | Documentos (§7) · Vídeo 7 |
| `08-dashboard-movil.png` | Dashboard en **móvil** con bottom-nav y sesiones del día | Sección responsive · vídeos móviles |
| `demo-club.xlsx` | El Excel demo usado para sembrar (re-importable) | Demostración de la importación |

> Los datos demo se cargaron **importando `demo-club.xlsx`** desde la propia pantalla de Configuración → Importar: la migración real funcionó (25 registros creados, referencias resueltas por nombre), lo que valida de paso el argumento de venta de la §9.

---

### Apéndice A-bis — Hallazgos técnicos y su resolución (vía Supabase CLI / Management API)

Al sembrar el club demo aparecieron **2 incidencias reales de la base de datos** (no del Excel ni del importador). **Ambas quedaron resueltas:**

1. **`sesiones.estado` no aceptaba `NoRealizada` → RESUELTO.** La sesión "No realizada" fallaba con `violates check constraint "sesiones_estado_check"`. Causa real: aunque `migration list` marcaba la [011](supabase/migrations/011_estado_no_realizada.sql) como aplicada, una migración posterior de snapshot ([`019_snapshot_estado_real.sql`](supabase/migrations/019_snapshot_estado_real.sql)) **había recreado la constraint sin ese valor**. Verificado en remoto: `CHECK (estado IN ('Borrador','Planificada','Realizada'))`.
   → Se re-aplicó el CHECK correcto (idempotente) en el proyecto remoto (`rgmrqkoudyotkpqgezzv`) y se dejó documentado en [`20260605120000_refix_sesiones_estado_norealizada.sql`](supabase/migrations/20260605120000_refix_sesiones_estado_norealizada.sql), marcado como aplicado con `supabase migration repair`. Constraint actual: `… IN ('Borrador','Planificada','Realizada','NoRealizada')`. Ya se pueden crear sesiones "No realizada" (badge rojo en `01-dashboard.png` y `09-sesion-nota-lluvia.png`).
2. **Importar `ejercicios` fallaba por RLS → ACLARADO Y SEMBRADO.** Daban `new row violates row-level security policy for table "ejercicios"`. **No es una migración pendiente**: la policy `ejercicios_mutate` exige `sede_propietaria_id = current_user_sede_id()` (o SuperAdmin), y (a) los ejercicios globales tienen `sede_propietaria_id = NULL`, (b) el usuario de prueba es `rol='Entrenador'` ligado a otra sede en la tabla legacy `usuarios`. Es **diseño de la policy**, no un fallo de despliegue, así que **no se tocó la seguridad de producción**. Los 5 ejercicios demo se insertaron directamente (seed admin que omite RLS legítimamente) y se ven en `15-ejercicios.png`.
   > Recomendación de producto (opcional): si se quiere que un AdminSede/Entrenador pueda crear ejercicios **globales** desde la UI, habría que ampliar el `WITH CHECK` de `ejercicios_mutate` para contemplar `es_global = true` con el rol adecuado. Decisión de diseño, no urgente.

> Nota de método: se evitó `supabase db push` a propósito. El historial de migraciones está desincronizado con el remoto (`APPLY_NOW.sql` elimina `workspaces`, pero la app usa `workspace_members`; hay 3 migraciones locales sin aplicar, una sin commitear). Un push reaplicaría `001_initial_schema` sobre tablas existentes. El fix se aplicó **quirúrgicamente** con el token del CLI vía la Management API, y se registró en el historial con `migration repair`.

---

### Apéndice B — Inventario de verdad del producto (para no prometer humo)

**Ya existe y se puede grabar/capturar hoy** *(verificado entrando en la app en vivo — Club Atlético Test):*
Dashboard semanal con navegación por semanas, selector de día con contador, mini-calendario mensual y filtros por sede/periodo/estado · módulos de Sedes, Equipos, Entrenadores, Jugadores, Usuarios, Ejercicios, Sesiones, Documentos, Parámetros (todos con su tabla, búsqueda y formulario "Nuevo") · estados de sesión (`Borrador`/`Planificada`/`Realizada`/`No realizada`) · **notas/feedback post-entreno del entrenador** en el detalle de sesión · **programación recurrente de sesiones** (rango de fechas + días de la semana) · documentos como **archivo (cualquier formato)** o **enlace** (placeholder real: *"YouTube, Vimeo, Google Drive o cualquier web"*) con asociación multi-sede/equipo y **visibilidad por entrenador** · **exportación a Excel** (1 hoja por entidad, referencias por nombre) · **importación desde archivo `.xlsx` y desde URL de Google Sheets/Drive** con reconocimiento flexible de columnas, vinculación por nombre, idempotencia y parte de resultados por entidad/fila · plantilla de importación descargable · invitación de usuarios por enlace · 5 roles con matriz de permisos ver/modificar · multi-sede y multi-equipo · **app responsive** con bottom-nav móvil · **campana de notificaciones presente en la barra superior** (con indicador rojo).

**Se presenta como visión/evolución (descrito como vivo en la narrativa de venta, en construcción técnica):**
El **feed de actividad en tiempo real** que, al pulsar la campana, despliega la lista de notas/estados de sesión y **empuja un aviso** al admin en el instante en que el entrenador guarda (hoy la campana es el contenedor visual; el panel desplegable es el siguiente paso). El dato base — estado + nota de sesión — y el punto de entrada en la UI ya existen. La **conexión nativa con Google Drive** para *guardar* archivos (adaptador `driveAdapter` ya definido) complementa a la importación desde Drive, que sí es real hoy.
```
