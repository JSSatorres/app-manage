# SportApp · Landing Page — Documento final de diseño, copy y producción

> **Documento maestro de la landing page de presentación y venta de SportApp.**
> Fusiona y depura las dos aproximaciones previas (`LANDING_PAGE.md` y `landing-page.md`) en una sola versión definitiva, **verificada contra el código real del producto** (tipos, servicios, componentes, matriz de permisos y tokens de `globals.css`) en junio de 2026.
>
> Cumple tres funciones a la vez:
> 1. **Hoja de presentación para vender el proyecto** (pitch, copy y argumentario).
> 2. **Especificación de construcción** de la landing en Next.js 16 (estructura, wireframes, sistema de diseño).
> 3. **Guion de producción de los vídeos** explicativos (plano a plano, sobre flujos reales).
>
> Idioma de toda la UI y el copy: **español**. Marca: **SportApp · Elite Management**.

---

## 0. Resumen ejecutivo (el pitch en 30 segundos)

**SportApp es el sistema operativo del club deportivo.** Reemplaza el caos de tener las sedes en un Excel, los jugadores en otro, los entrenamientos en un Drive compartido y las cancelaciones en grupos de WhatsApp. Todo vive conectado: cuando un entrenador cierra una sesión y deja una nota — *"cancelada por lluvia"*, *"lesión de Martín en el minuto 30"* —, **el administrador lo ve en su dashboard**, sin llamar a nadie.

Lo que en una hoja de cálculo son cinco pestañas que nadie mantiene sincronizadas, en SportApp es **un dato único que se actualiza solo** para todos los que tienen permiso para verlo.

**Una frase para la home:**
> **El club entero, en una sola pantalla. Deja el Excel y el Drive donde estaban: en el pasado.**

**A quién le hablamos:** director deportivo, coordinador, jefe de cantera o dueño del club — **no** al programador. Verbos de acción, frases cortas, beneficio antes que característica.

---

## 1. Sistema de diseño (tokens reales del producto)

La landing reutiliza la identidad visual de la app para que la transición *web → producto* sea pixel-perfect. **Valores extraídos de `src/app/globals.css`** (no de capturas):

| Token | Valor | Uso |
|---|---|---|
| **Primario** | `#3358ff` (azul eléctrico) | CTAs, enlaces, acentos, logo, elemento activo del sidebar |
| **Texto** | `#16181d` (casi negro) | Titulares y cuerpo |
| **Fondo** | `#ffffff` (blanco puro) | Base — estética minimalista |
| **Muted** | `#f6f7f9` / `#9498a1` | Secciones alternas, texto secundario |
| **Éxito** | `#10b981` (esmeralda) | Estado *Realizada*, métricas positivas |
| **Aviso** | `#f59e0b` (ámbar) | Estado *Borrador* |
| **Peligro** | rojo/rosa (`rose-500`) | Estado *No realizada*, cancelaciones |
| **Radio** | `0.75rem` base (tarjetas muy redondeadas) | `rounded-xl` |
| **Tipografía** | **Geist Sans** (`--font-sans`), tracking `-0.02em` | Titulares y cuerpo |

> ⚠️ **Corrección de marca:** la paleta correcta es `#3358ff` + **Geist Sans**. La aproximación que indicaba `#4F46E5` / Inter estaba inferida de un screenshot y es incorrecta — descártala.

**Logotipo:** icono **Zap (⚡)** en cuadrado redondeado azul `#3358ff` + wordmark "SportApp" y kicker "ELITE MANAGEMENT" en mayúsculas espaciadas.

**Tono visual:** minimalismo nórdico — mucho blanco, bordes finos, sombras suaves, tarjetas `rounded-xl`, micro-animaciones con Framer Motion (las mismas que usa la app). **Capturas reales del producto como protagonistas**, no ilustraciones genéricas.

**Tono de voz del copy:** directo, profesional, sin jerga técnica. Nada de "Supabase", "PostgreSQL" ni "RLS" en el copy de cara al cliente.

---

## 2. Estructura de la página (mapa de secciones)

```
┌────────────────────────────────────────────────────────────────────┐
│  NAV   Logo · Funciones · Vídeos · Precios · [Entrar] [Probar gratis]│
├────────────────────────────────────────────────────────────────────┤
│  1. HERO              Titular + captura del Dashboard semanal         │
│  2. EL PROBLEMA       "¿Te suena esto?" — tu club vive en 7 pestañas  │
│  3. LA SOLUCIÓN       El dato único y conectado (diagrama de grafo)   │
│  4. RECORRIDO         9 módulos, sección por sección (con conexiones) │
│  5. FEATURE ESTRELLA  Actividad en tiempo real / notas post-entreno   │
│  6. COMPARATIVA       SportApp vs Excel + Drive (tabla fila a fila)   │
│  7. MIGRACIÓN         "Importa tu Excel (o tu Google Sheets) en un clic"│
│  8. MULTI-SEDE        Un panel, todas las instalaciones              │
│  9. ROLES             5 roles · matriz ver / modificar               │
│ 10. VÍDEOS            Galería de tutoriales + guiones de producción   │
│ 11. TESTIMONIOS       Prueba social                                  │
│ 12. PRECIOS           Planes                                          │
│ 13. FAQ               Dudas frecuentes                               │
│ 14. CTA FINAL         "Empieza hoy"                                  │
│ 15. FOOTER                                                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Sección 1 — HERO

**Objetivo:** en 5 segundos el visitante entiende qué es y por qué le cambia la vida.

```
        ⚡ SportApp · ELITE MANAGEMENT

   Gestiona todo tu club deportivo
   desde una sola pantalla.

   Sedes, equipos, jugadores, entrenadores, sesiones y
   documentos — conectados de verdad. Cuando algo cambia,
   lo cambia para todos. Adiós a los Excel desactualizados.

   [  Probar gratis  ]   [ ▶ Ver cómo funciona (2 min) ]

   ★★★★★  Clubes de fútbol, baloncesto y academias ya entrenan con cabeza

   ┌───────────────────────────────────────────────┐
   │   [ CAPTURA REAL DEL DASHBOARD SEMANAL ]       │
   │   Calendario · sesiones del día · estados      │
   │   con badge "No realizada · por lluvia"        │
   └───────────────────────────────────────────────┘
```

**Copy definitivo:**

- **Kicker:** `⚡ SportApp · ELITE MANAGEMENT`
- **H1:** **Gestiona todo tu club deportivo desde una sola pantalla.**
  - *Alt A/B:* **Gestiona tu club como un equipo de élite.**
- **Subtítulo:** Sedes, equipos, jugadores, entrenadores, sesiones y documentos — conectados de verdad. Cuando algo cambia, se actualiza para todos. **Sin hojas de cálculo. Sin archivos perdidos. Sin "¿dónde estaba ese ejercicio?".**
- **CTA primario:** `Probar gratis` (botón azul `#3358ff`, lleva a `/register`)
- **CTA secundario:** `▶ Ver cómo funciona (2 min)` (abre el vídeo overview de §10)
- **Prueba social inline:** `Clubes de fútbol, fútbol sala, baloncesto, balonmano y academias multideporte ya entrenan con SportApp`

**Imagen hero:** captura real del **Dashboard semanal** (`DashboardPage`): navegación por semanas, selector de días con contador de sesiones, mini-calendario mensual y los badges de estado de colores (*Realizada* verde, *Planificada* azul, *Borrador* ámbar, *No realizada* rojo). Esa captura ya **cuenta la historia entera**.
→ Asset: `landing-assets/01-dashboard.png`

**Stats bar bajo el hero** *(activar cuando haya datos reales)*:

| +500 sesiones planificadas | +40 equipos gestionados | +12 clubes activos | Pensada para usarse en el campo |
|---|---|---|---|

---

## 4. Sección 2 — EL PROBLEMA (con el que el visitante se identifica)

**Titular:** **Tu club no vive en una herramienta. Vive en siete.**

### Bloque "¿Te suena esto?"

```
┌──────────────────────────────────────────────────────────────────┐
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
└──────────────────────────────────────────────────────────────────┘
```

### Tres columnas con el dolor real

| 📊 El Excel zombie | 📁 El Drive caótico | 💬 El WhatsApp infinito |
|---|---|---|
| "Jugadores_v3_FINAL_BUENO.xlsx". Nadie sabe cuál es la versión buena. Cambias un dorsal y se desincroniza de la plantilla del equipo. | Carpetas dentro de carpetas. Los ejercicios en PDF que solo encuentra quien los subió. El vídeo de la jugada perdido en "Sin título (3)". | "¿Quién cubre el entreno del sábado?", "se ha cancelado por lluvia", "¿alguien tiene la ficha de Martín?". La información se evapora al hacer scroll. |

**Cierre de sección (frase puente):**
> Cada herramienta funciona sola. El problema es que **tu club no funciona en piezas sueltas.** Un jugador pertenece a un equipo, que entrena en una sede, en una sesión que tiene ejercicios y la cubre un entrenador. Si eso no está conectado, **alguien acaba copiando datos a mano.** Y donde se copia a mano, se equivoca.

---

## 5. Sección 3 — LA SOLUCIÓN (el dato único y conectado)

**Titular:** **Un solo sitio. Todo conectado. Se actualiza solo.**

**Subtítulo:** En SportApp no hay copias. Hay **un dato vivo** que cada persona ve según su rol. Cambias el nombre de una sede una vez y cambia en los equipos, las sesiones, los documentos y los informes. Como debe ser.

**Diagrama de relaciones (renderizar como grafo animado).** *Las relaciones marcadas «M:N» son muchos-a-muchos reales en el modelo de datos — lo que un Excel no puede representar.*

```
                    🏢 WORKSPACE (tu club)
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          🏟️ SEDE A       🏟️ SEDE B       🏟️ SEDE C
              │
        ┌─────┴───────────────┐
        │                     │
    🛡️ EQUIPO  ───M:N───  👤 JUGADORES (multi-sede / multi-equipo)
        │   \
        │    └──M:N──  📋 ENTRENADORES (multi-sede / multi-equipo)
        │
        📅 SESIÓN (fecha · hora · objetivo · estado · microciclo)
          │         │                    │
   🏋️ EJERCICIOS   📝 NOTAS POST-ENTRENO  👥 entrenador(es) asignados (M:N)
   (orden, tiempo,
    descanso, variante)
          │
     📄 DOCUMENTOS (PDF, vídeo, enlaces de Drive/YouTube) ──M:N── sedes/equipos
```

**Tres bloques de beneficio bajo el diagrama:**

1. **Cambia una vez, cambia en todo.** Renombras una sede, mueves un jugador de equipo o actualizas la titulación de un entrenador — y toda la app lo refleja. Cero copia-pega. *En Excel, el nombre de un jugador vive en 6 archivos; aquí existe una sola vez.*
2. **Nada se pierde de contexto.** Un ejercicio sabe a qué sesiones pertenece. Una sesión sabe qué equipo, qué entrenador y qué documentos lleva. Haces clic y tienes la historia completa.
3. **Cada quien ve lo suyo.** El dato es único, pero la vista es personal: el dueño ve todas las sedes; el gerente, la suya; el entrenador, sus equipos.

---

## 6. Sección 4 — RECORRIDO POR LOS MÓDULOS

> Bloque "feature tour". Cada módulo: **icono + nombre + qué resuelve + Lo que hace posible + a qué se conecta.** Cada tarjeta lleva una etiqueta **↔ Conecta con:** — justo lo que un Excel no tiene. Acompañar de captura real y enlazar a su vídeo (§10).

### 6.1 📊 Dashboard — "El pulso del club"
La pantalla de inicio (titulada **"Panel de rendimiento"**). Vista **semanal** de todas las sesiones, con navegación por semanas, **selector de días con contador de sesiones**, **mini-calendario mensual** desplegable y **filtros por sede, periodo de temporada y estado**. Haces clic en una sesión y se abre su ficha completa sin cambiar de página.

**Lo que hace posible:**
- Ver de un vistazo qué sesiones hay esta semana en cada sede, con su estado de color.
- Navegar a semanas pasadas para revisar la actividad.
- Abrir cualquier sesión y leer/editar las **notas del entrenador** ahí mismo.
- Cambiar de club y de sede desde el selector de la cabecera.

**↔ Conecta con:** sesiones, equipos, sedes y las notas del entrenador. *Es el cristal por el que se ve todo lo demás.*
→ `landing-assets/01-dashboard.png` · `landing-screenshots/02-dashboard.png`

### 6.2 🏟️ Sedes — "Tus centros, ordenados"
Da de alta cada centro/instalación (nombre, dirección, responsable). Toda la actividad (equipos, sesiones, ejercicios, documentos) cuelga de una sede. Vista en **acordeón expandible** con sus equipos, entrenadores y jugadores.

**Lo que hace posible:**
- Crear y gestionar múltiples sedes bajo un mismo club.
- Asignar un responsable por sede.
- Invitar usuarios directamente a una sede concreta.

**↔ Conecta con:** equipos, entrenadores, jugadores, ejercicios y documentos. Cambia el nombre aquí y cambia en todas partes.
→ `landing-screenshots/05-sedes.png`

### 6.3 🛡️ Equipos — "La plantilla viva, el nodo central"
Cada equipo pertenece a una sede y tiene **categoría** (`Sub-14`, `Sub-16`, `Sénior`…). Asignas entrenadores y jugadores con selector múltiple — relaciones **muchos-a-muchos** reales, sin duplicar a nadie. Cuando planificas una sesión para el Sub-16 A, el sistema ya sabe quién lo forma.

**↔ Conecta con:** jugadores y entrenadores (M:N), sede y sesiones.
→ `landing-screenshots/04-equipos.png`

### 6.4 📋 Entrenadores — "El cuerpo técnico"
Fichas con nombre, apellidos, email, teléfono, fecha de nacimiento, **titulación**, foto y notas internas. **Un entrenador puede pertenecer a varias sedes y varios equipos** a la vez, y tener una **cuenta de acceso vinculada** o ser solo un registro.

**↔ Conecta con:** equipos, sedes y las sesiones que dirige (y firma con sus notas).
→ `landing-screenshots/11-entrenadores.png`

### 6.5 👤 Jugadores — "La ficha que no se pierde"
Nombre, apellidos, **dorsal**, **posición**, **pie dominante** (diestro/zurdo/ambidiestro), foto, contacto, **datos del tutor** (clave en categorías base) y notas. Multi-sede y multi-equipo.

**↔ Conecta con:** equipos y sedes. Su historial deja de vivir en una fila de Excel.
→ `landing-screenshots/12-jugadores.png`

### 6.6 🏋️ Ejercicios — "Tu biblioteca de entrenamiento"
Catálogo con **objetivo principal** y **nº mínimo de jugadores**. Cada ejercicio puede ser **global del club** o **propio de una sede**, y lleva **documentos adjuntos** (PDF, vídeos, enlaces). Al montar una sesión, se eligen de la biblioteca con **orden, tiempo de ejecución, descanso y variante aplicada**.

**↔ Conecta con:** sesiones y documentos. *El conocimiento del club deja de vivir en el móvil de un entrenador.*
→ `landing-screenshots/06-ejercicios.png`

### 6.7 📅 Sesiones — "El entrenamiento, de la idea al informe"
El módulo central. Planificas: fecha, hora, duración estimada, equipo, **uno o varios entrenadores**, microciclo, periodo de temporada (*Pretemporada / Competición*), objetivo y observaciones previas. Cada sesión avanza por estados:

`Borrador` (ámbar) → `Planificada` (azul) → `Realizada` (verde) / `No realizada` (rojo)

Al terminar, el entrenador deja su **feedback post-entreno**. Montas la sesión a partir de tu biblioteca de ejercicios y le adjuntas documentos.

> 🗓️ **Programación en lote (verificado en producto, y más potente de lo que parece):** no creas las sesiones una a una. Eliges un rango **Desde / Hasta**, marcas los **días de la semana** (Lun–Dom) e incluso defines **franjas horarias por día**; SportApp genera **todos** los entrenamientos del periodo de golpe, con una **previsualización** antes de confirmar. Un mes de planificación en diez segundos — impensable copiando filas en un Excel.

**↔ Conecta con:** equipos, entrenadores, ejercicios, documentos y el dashboard del admin. *Aquí nace la feature estrella (§7).*
→ `landing-assets/02-nueva-sesion.png` · `landing-screenshots/03-sesiones.png`

### 6.8 📄 Documentos — "El Drive, pero con sentido"
Dos tipos: **archivo** subido a almacenamiento seguro (PDF, vídeo, imagen, lo que sea) **o** **enlace externo** (YouTube, Vimeo, Google Drive, web). Categorízalos y decide su **visibilidad granular**: todos los entrenadores o solo algunos seleccionados. Asócialos a **sedes y equipos (M:N)**, a ejercicios o a sesiones.

**Lo que hace posible:**
- Subir ficheros directamente (almacenamiento privado y seguro).
- Enlazar vídeos de YouTube o carpetas de Drive sin moverlos.
- Controlar quién ve qué: no todos los entrenadores ven todos los documentos.
- Ver el vídeo de YouTube **embebido en el detalle de la sesión**, sin salir de la app.

**↔ Conecta con:** todo. Un documento siempre sabe a qué pertenece — el opuesto exacto de una carpeta perdida.
→ `landing-assets/05-documentos.png` · `06-doc-archivo.png` · `07-doc-enlace.png`

### 6.9 👥 Usuarios — "Quién entra y con qué permisos"
Invitas a tu equipo **por enlace**: el admin selecciona email y rol, la persona se registra y queda **automáticamente vinculada** a la sede y el rol correctos. Gestión de accesos centralizada.

**↔ Conecta con:** la matriz de roles (§9) y las fichas de entrenador/jugador (vinculación de cuenta).
→ `landing-screenshots/08-usuarios.png` · `10-configuracion.png`

### 6.10 ⚙️ Parámetros (admin) — "Tu club, a tu medida"
Configura los desplegables del sistema: **tipos de objetivo, tipos de contenido, material y categorías de edad**. La app se adapta a tu vocabulario, no al revés.
→ `landing-screenshots/09-parametros.png`

---

## 7. Sección 5 — FEATURE ESTRELLA: Actividad en tiempo real

> 🎯 **El "momento mágico" de la demo.** Merece su propio bloque a pantalla completa, con animación. Es la respuesta tangible a "¿por qué no un Excel?".

**Titular:** **El entrenador anota. El director se entera. Sin una sola llamada.**

**Subtítulo:** Cuando un entrenamiento termina, el entrenador deja sus notas en la sesión desde el campo. En ese instante, esa nota **viaja al dashboard del administrador** y queda registrada para siempre. Lo que pasó en el césped deja de evaporarse.

**Narrativa visual (split-screen animado, se dispara al hacer scroll):**

```
  📱 LADO ENTRENADOR (en el campo)         🖥️ LADO ADMIN (en la oficina)
  ┌─────────────────────────────┐        ┌──────────────────────────────┐
  │ Sesión · Infantil A          │        │  Dashboard — Hoy             │
  │ Estado: [ No realizada ▼ ]   │  ───▶  │  ┌────────────────────────┐  │
  │                              │        │  │ 18:00 Infantil A   🔔  │  │
  │ Notas del entrenador:        │        │  │ 🔴 No realizada        │  │
  │ "Cancelada por lluvia.       │        │  │ "Cancelada por lluvia" │  │
  │  Recuperamos el jueves."     │        │  └────────────────────────┘  │
  │ [ Guardar notas ]            │        │   ↑ aparece al instante      │
  └─────────────────────────────┘        └──────────────────────────────┘
```

**Cómo funciona:**
1. El entrenador termina la sesión y la marca como *Realizada* o *No realizada*.
2. Escribe sus notas en el campo **"Notas del entrenador" / feedback post-entreno**: *"cancelada por lluvia"*, *"el portero llegó tarde"*, *"lesión de tobillo del 7, avisado el fisio"*.
3. **El administrador y el director técnico lo ven en el Dashboard** — la sesión aparece señalizada con su estado y un aviso en la campana.
4. Al abrir la sesión, está todo: fecha, entrenador, ejercicios realizados y las notas.

**Ejemplos de actividad que el admin ve aparecer en su panel (carrusel de tarjetas):**

- 🔴 **No realizada** — *"Cancelada por lluvia. Campo encharcado, recuperamos el jueves."*
- 🟠 **Incidencia** — *"Lesión de Martín en el minuto 30, tobillo derecho. Avisado el fisio."*
- 🟢 **Realizada** — *"Gran intensidad. El bloque de transiciones funcionó muy bien."*
- 🔵 **Cambio de plan** — *"Solo vinieron 8 jugadores: adaptamos a rondos."*
- 🟡 **Pendiente** — *"Faltan 4 conos y 2 petos. Comprar antes del sábado."*

**Tres beneficios:**
1. **Trazabilidad total.** Cada sesión guarda qué pasó, por qué y quién lo anotó. El histórico del club, escrito solo. Puedes revisar el entrenamiento del 15 de octubre dentro de dos años.
2. **Decisiones con datos.** ¿Cuántas sesiones se caen por lluvia en esta sede? ¿Qué equipo acumula incidencias? Ya no es una sensación: es un dato.
3. **Cero teléfono roto.** La nota la escribe quien estuvo allí y la lee quien decide. Sin intermediarios, sin "me dijeron que…".

**Casos de uso reales (para el copy):**
- "Cancelada por lluvia · Recuperamos el jueves"
- "Lesión de isquiotibial en el delantero centro · Revisar con el fisio"
- "El Sub-14 B necesita refuerzo en salida de balón · Ver vídeo adjunto"
- "Sesión muy buena · Plantilla lista para el partido del sábado"
- "Conflicto en el vestuario · Hablar con el coordinador"

**Callout de cierre:**
> En un Excel, esto sería una celda que alguien tiene que acordarse de rellenar, en una pestaña que alguien tiene que acordarse de abrir. En SportApp, **es el flujo natural de cerrar un entrenamiento** — y llega solo a quien tiene que verlo.

---

## 8. Sección 6 — COMPARATIVA: la ventaja de estar conectado vs. Excel + Drive

> **Este es el corazón del argumento de venta.** Fila por fila, por qué un sistema conectado gana a "una tabla de Excel + un documento de Drive".

**Titular:** **Lo que un Excel y un Drive nunca podrán hacer.**

| Lo que necesitas hacer | 📊 Excel + 📁 Drive | ⚡ SportApp |
|---|---|---|
| **Mover un jugador de equipo** | Lo borras de una pestaña, lo pegas en otra y rezas por no equivocarte de fila | Lo asignas una vez; su ficha, su equipo y sus sesiones se actualizan solas |
| **Saber qué pasó en el entreno del sábado** | Preguntas por WhatsApp y esperas | Lo lees en el dashboard: estado + nota del entrenador |
| **Una cancelación por lluvia** | Un mensaje que se pierde en el grupo | Estado *No realizada* + motivo, visible en el panel del admin y registrado para siempre |
| **Encontrar el vídeo de un ejercicio** | "¿En qué carpeta estaba?" | Está adjunto al ejercicio y a la sesión donde se usó. Un clic |
| **Permisos por persona** | Compartes el Drive entero o nada | Cada rol ve y edita solo lo suyo (5 niveles) |
| **Quién puede tocar qué** | Cualquiera con el enlace edita y borra filas | Matriz de permisos por recurso: **ver** vs. **modificar** |
| **Datos al día** | Tantas versiones como personas | Un único dato vivo, siempre el bueno |
| **Historial permanente** | Una hoja sobreescrita pierde la historia | Cada sesión, nota y cambio queda registrado y vinculado |
| **Trabajar desde el móvil en el campo** | Excel en el móvil es una tortura | App responsive con navegación inferior pensada para el móvil |
| **Buscar la ficha de un jugador** | Ctrl+F en 300 filas | Búsqueda y filtros por sede, equipo, posición, estado |
| **Empezar con tus datos actuales** | — | **Importas tu propio Excel tal cual y SportApp lo conecta solo** (ver §9) |
| **Traer una hoja que vive en Google** | La abres y la sigues editando suelta | Pegas el enlace de tu **Google Sheets/Drive** y SportApp la importa y la conecta |
| **Planificar un mes de entrenamientos** | 30 filas copiadas a mano | Eliges rango de fechas + días + franjas y se generan todas de golpe |
| **Riesgo de pérdida** | Un archivo borrado o sobreescrito es catastrófico | Base de datos gestionada con copias de seguridad |

**Frase de cierre (callout destacado):**
> Excel y Drive son geniales para **guardar** datos. SportApp es para **operar** un club. La diferencia es la misma que entre una libreta y un copiloto.

> 💡 **Y lo mejor:** no tienes que elegir. SportApp **lee tu Excel** para empezar y **conecta tus archivos de Drive y enlaces de YouTube** como documentos. Te llevas lo bueno de tus herramientas y dejas atrás el caos.

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

**Lo que lo hace sentir mágico (puntos de venta, todos verificados en el servicio real):**

- **Reconoce tus encabezados aunque no coincidan.** ¿Pusiste "Teléfono", "Móvil" o "Tel."? ¿"Coach" en vez de "Entrenador"? Lo entiende igual: acepta sinónimos y normaliza acentos y mayúsculas.
- **Conecta por nombre, no por código.** Escribes "Sede Norte" en la pestaña de equipos y SportApp lo vincula a la sede real. Nada de IDs ni UUIDs.
- **Respeta el orden de dependencias.** Crea primero las sedes, luego los equipos, luego jugadores y entrenadores, y al final las sesiones — solo. Tú no piensas en eso.
- **No duplica (idempotente).** Si vuelves a importar, omite lo que ya existe. Puedes reimportar sin miedo.
- **Te da un parte claro.** Al terminar ves **cuántos registros se crearon, cuántos se omitieron y exactamente en qué fila hubo un problema**, hoja por hoja.
- **Plantilla lista para usar.** ¿Empiezas de cero? Descarga la plantilla con todas las pestañas y los encabezados correctos.
- **Importa pegando el enlace de tu Google Sheets o Drive.** No la descargues: **pega la URL** y SportApp la trae sola (basta con que esté compartida como "cualquiera con el enlace"). El puente directo entre tu Drive y un club conectado.

**Y al revés — Exporta cuando quieras:**
> Tus datos son tuyos. Exporta todo el club a un Excel con **un clic** (una hoja por entidad, con los nombres legibles, no códigos), listo para imprimir, compartir o archivar. **Sin lock-in.** Entras y sales con tu Excel cuando te dé la gana.

**Callout:**
> La migración no es un trámite: es la primera prueba de que SportApp respeta cómo ya trabajas. Tu Excel entra por una puerta y sale, al otro lado, convertido en un club que funciona conectado.

→ Assets: `landing-assets/04-import-excel-drive.png` (importar) · `03-export-excel.png` (exportar)

---

## 10. Sección 8 — MULTI-SEDE: un panel, todas las instalaciones

```
         WORKSPACE: Club Atlético ─────────────────────
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    Sede Norte      Sede Centro      Sede Sur
    Madrid Norte    Centro Ciudad    Leganés
         │               │               │
    Sub-14          Sub-16          Sénior A
    Sub-16          Sénior B        Sénior B
    Sénior          Femenino

   Cada sede tiene sus entrenadores, jugadores y documentos.
   El director técnico ve TODO desde un solo dashboard.
```

**Titular:** **Tres sedes, ocho equipos, cuarenta entrenadores. Un solo panel de control.**

**Descripción:** SportApp nació para clubes que crecen. Si hoy tienes una sede y mañana abres otra, no cambias de herramienta — solo añades la sede al mismo workspace. **Los entrenadores y jugadores pueden pertenecer a varias sedes a la vez.** Los documentos pueden ser globales del club o específicos de una instalación. El director técnico siempre tiene la vista completa; cada responsable de sede ve solo lo suyo.

**Selector de contexto en la cabecera:** el **selector de Club + Sede** de la barra superior permite cambiar de contexto en un clic. Admin → ve todos los datos. Gerente de la Sede Norte → solo ve la Sede Norte.

---

## 11. Sección 9 — ROLES: cada persona ve lo justo

**Titular:** **Cinco roles. Cada uno ve y toca solo lo suyo.**

**Subtítulo:** Compartir un Drive es todo o nada. SportApp da a cada persona exactamente el acceso que necesita — ni más (riesgo) ni menos (fricción). Y distingue **ver** de **modificar**.

| Rol | Qué puede hacer |
|---|---|
| 👑 **Super Admin** | Control total de todo el club y todas las sedes. |
| 🧭 **Admin (dueño del club)** | Gestiona el club entero: sedes, usuarios, parámetros y configuración. |
| 🏟️ **Gerente de sede** | Manda en su sede: equipos, entrenadores, jugadores, sesiones y documentos de su centro. No ve las ajenas. |
| 📋 **Entrenador** | Su día a día: ve sus equipos y jugadores, crea y cierra sesiones, monta ejercicios y deja notas. |
| 👤 **Jugador** | Acceso de consulta de su información, fuera del panel de gestión. |

**Matriz de permisos real (extraída de `src/lib/permisos.ts` — `view` / `mutate` por recurso):**

| Recurso | Super Admin | Admin | Gerente de sede | Entrenador | Jugador |
|---|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ✅ editar | ✅ editar | ✅ editar | 👁️ ver | — |
| Sedes | ✅ | ✅ | ✅ | — | — |
| Equipos | ✅ editar | ✅ editar | ✅ editar | 👁️ ver | — |
| Entrenadores | ✅ | ✅ | ✅ | — | — |
| Jugadores | ✅ | ✅ | ✅ | ✅ | — |
| Ejercicios | ✅ | ✅ | ✅ | ✅ | — |
| Sesiones | ✅ | ✅ | ✅ | ✅ | — |
| Documentos | ✅ | ✅ | ✅ | ✅ | — |
| Usuarios | 👁️ ver | ✅ editar | 👁️ ver | — | — |
| Parámetros | ✅ | ✅ | — | — | — |
| Configuración | ✅ | ✅ | — | — | — |

> ✅ = ver y modificar · 👁️ = solo ver · — = sin acceso. *El rol Jugador queda fuera del panel de gestión.*

**Incorporación (onboarding):**
1. El admin abre **Configuración → Invitar usuario**.
2. Introduce el email y selecciona rol (y sede).
3. La persona recibe un enlace personalizado.
4. Al registrarse, queda **automáticamente vinculada** al workspace y la sede correctos.
5. Solo ve lo que le corresponde, desde el primer segundo.

**Detalle que vende (callout):**
> Todo desde **una única matriz de permisos** — sin hojas compartidas a medias ni sustos de "¿quién borró esta fila?".

---

## 12. Sección 10 — VÍDEOS EXPLICATIVOS (galería + guiones de producción)

> 🎬 **Sección clave para la conversión.** El visitante *ve cómo se hace cada cosa y cómo se ve* la app de verdad. Layout: **vídeo destacado grande arriba** + **rejilla de 3 columnas** debajo. Reproductor embebido (los documentos tipo enlace de SportApp ya soportan YouTube/Vimeo, así que es coherente con el producto).
>
> **Guion recurrente de cada vídeo:** *(1)* el problema en 1 frase → *(2)* se hace en la app, en pantalla real → *(3)* se muestra el efecto conectado en otra parte ("…y mira, aquí también cambió solo"). Ese tercer paso es el que vende.

**Titular de sección:** **Míralo funcionando. 2 minutos y lo entiendes todo.**

### 🎥 Vídeo destacado (overview) — *"SportApp en 2 minutos"* · 2:10
Recorrido relámpago: del Excel caótico al club conectado. Termina en el momento estrella — la nota de "cancelada por lluvia" apareciendo en el dashboard del admin. **Es el vídeo del botón del hero.**

### Rejilla de tutoriales

| # | Vídeo | Dur. | Qué se ve |
|---|---|---|---|
| 1 | **Crea tu club en 60 segundos** | 1:00 | Onboarding: alta del workspace, primera sede, invitar al equipo. |
| 2 | **Importa tu Excel y míralo conectarse solo** ⭐ | 2:30 | Subes tu `.xlsx` (o pegas tu Google Sheets), SportApp reconoce las columnas y crea sedes, equipos y jugadores enlazados. El "antes/después" + parte de resultados. |
| 3 | **Monta una sesión de entrenamiento** | 2:00 | De `Borrador` a `Planificada`: equipo, entrenador, objetivo y ejercicios desde la biblioteca con orden y tiempos. |
| 4 | **Planifica un mes en lote** | 1:20 | Rango Desde/Hasta + días de la semana + franjas → previsualización → se generan todas las sesiones de golpe. |
| 5 | **El entrenador cierra la sesión y deja notas** ⭐ | 1:30 | Desde el móvil, en el campo: marcar `No realizada`, escribir "cancelada por lluvia" y guardar. |
| 6 | **Cómo el admin ve la actividad en su dashboard** ⭐ | 1:20 | El otro lado: la nota y el estado aparecen en el panel; filtros por sede, periodo y estado. |
| 7 | **Biblioteca de ejercicios con vídeos** | 1:45 | Crear un ejercicio, adjuntar un PDF y un enlace de YouTube, marcarlo como global o de sede. |
| 8 | **Documentos: archivos, Drive y enlaces** | 1:40 | Subir un PDF, enlazar un Drive/YouTube, categorizar y elegir qué entrenadores lo ven. |
| 9 | **Multi-sede en acción** | 3:00 | Cambiar de sede en el selector, un entrenador en dos sedes, ver todas las sesiones juntas. |
| 10 | **Roles y permisos en acción** | 1:25 | La misma pantalla vista por un admin, un gerente y un entrenador. Quién ve qué. |
| 11 | **Exporta todo tu club a Excel** | 0:50 | Un clic, descarga con nombres legibles. "Sin lock-in". |

### Guiones de producción (plano a plano, sobre flujos reales)

> Grabar con la **cuenta demo** (rol admin), datos sembrados (ver `landing-assets/_gen-demo.cjs` y `demo-club.xlsx`), resolución mínima 1920×1080, narración en off, ritmo tranquilo, **subtítulos en español**.

**VÍDEO 1 — Visión general: el dashboard del director técnico** · 3 min
```
00:00  Pantalla de login (UI limpia y profesional).
00:10  Login con email → Dashboard ("Panel de rendimiento").
00:20  Calendario semanal: navegar entre semanas, selector de sede, filtro de estado.
01:00  Crear una sesión: Sub-16, jueves 18:00, entrenador Carlos, objetivo "Presión tras pérdida".
01:45  La sesión aparece en el calendario del dashboard, con su badge de estado.
02:00  Abrir la sesión → campo "Notas del entrenador":
       "Sesión cancelada por lluvia. Trabajo de vídeo en sala. Ojo con Marcos, tobillo derecho."
02:30  Guardar. La sesión queda con su estado y la nota visible al abrirla.
02:50  El admin abre la sesión desde el dashboard y lee las notas.
03:00  FIN.
```
**Mensaje clave:** *"El entrenador escribe sus notas. El admin las ve. Nada se pierde."*

**VÍDEO 2 — Del Excel a SportApp en minutos** · 4 min
```
00:00  Un Excel típico de planificación: fechas, equipos, entrenadores, estados.
00:30  Configuración → Importar. Subir el `.xlsx` (o pegar la URL de Google Sheets).
00:50  Parte de resultados: X sedes, X equipos, X jugadores, X sesiones creados (y omitidos/errores por fila).
01:30  Ir al dashboard: las sesiones ya están en el calendario.
02:00  Filtrar por sede "Sede Norte" y por estado "Planificada".
02:30  Abrir una sesión importada y añadirle un ejercicio de la biblioteca.
03:30  Exportar de vuelta a Excel: los datos siempre son del club. "Sin lock-in".
04:00  FIN.
```
**Mensaje clave:** *"No empieces desde cero. Importa lo que ya tienes."*

**VÍDEO 3 — La biblioteca de ejercicios: crea una vez, usa siempre** · 3 min
```
00:00  Abrir Ejercicios.
00:15  Crear "Rondo 4v1 en cuadrado". Objetivo "Posesión bajo presión". Mínimo 5 jugadores.
00:45  Adjuntar un vídeo de YouTube (documento tipo enlace).
01:00  Adjuntar un PDF con el diagrama (documento tipo archivo). Marcar como global del club.
01:30  Sesiones → Nueva: añadir el ejercicio desde la biblioteca (orden 1, 15 min, variante "4v2").
02:00  Ver la sesión con el ejercicio adjunto y el vídeo accesible desde el detalle.
02:30  Cambiar de usuario: otro entrenador ve el mismo ejercicio.
03:00  FIN.
```
**Mensaje clave:** *"El conocimiento del club no vive en el móvil de un entrenador. Vive en SportApp."*

**VÍDEO 4 — Multi-sede: varias instalaciones desde un panel** · 3 min
```
00:00  Dashboard: en la cabecera "Club Atlético / Mi sede".
00:15  Desplegar el selector: aparecen las sedes (canarias, Mi sede, Sede Norte…).
00:30  Seleccionar "Sede Norte": el dashboard muestra solo sus sesiones.
01:00  Sedes → expandir "Sede Norte": equipos, entrenadores y jugadores en acordeón.
01:30  Un mismo entrenador en Sede Norte y Sede Centro a la vez.
02:00  Crear una sesión en Sede Norte: solo aparecen sus entrenadores en el selector.
02:30  Quitar el filtro de sede: el dashboard muestra todas las sedes juntas.
03:00  FIN.
```
**Mensaje clave:** *"Crece sin límites. Añade sedes sin cambiar de herramienta."*

**VÍDEO 5 — Control de accesos: invita a tu equipo** · 2 min
```
00:00  Configuración → Invitar usuario.
00:10  Email del entrenador + rol "Entrenador" + sede "Sede Norte".
00:25  "Generar invitación": aparece el enlace listo para copiar.
00:45  El entrenador abre el enlace → pantalla de registro → se registra.
01:10  Entra y solo ve Sesiones, Ejercicios, Documentos de su sede. NO ve Usuarios, Parámetros ni otras sedes.
01:40  Desde el admin, el nuevo entrenador aparece en la lista de Usuarios con su rol.
02:00  FIN.
```
**Mensaje clave:** *"Una invitación, un clic. Cada quien ve lo suyo desde el primer segundo."*

**VÍDEO 6 — Documentos: todo el material táctico en un lugar seguro** · 2:30
```
00:00  Abrir Documentos.
00:15  Documento tipo archivo: subir "Sistema defensivo 4-4-2". Categoría Táctico. Visible para entrenadores: sí.
00:45  Documento tipo enlace: pegar URL de YouTube ("Análisis del rival"). Asignar solo al Sub-16 A.
01:15  Adjuntar el PDF a un ejercicio de presión alta.
01:30  Abrir una sesión y adjuntar el vídeo de YouTube como recurso.
01:50  Vista del entrenador: ve el vídeo embebido en el detalle de la sesión, sin salir de la app.
02:20  FIN.
```
**Mensaje clave:** *"El material táctico, organizado y accesible. Para siempre."*

**Layout de la galería en la landing:**
```
┌──────────────────────────────────────────────────────────────────────┐
│   Aprende a usar SportApp en menos de 20 minutos                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ ▶ Dashboard  │  │ ▶ Del Excel  │  │ ▶ Biblioteca │                │
│  │   director   │  │   a SportApp │  │   ejercicios │                │
│  │   3 min      │  │   4 min      │  │   3 min      │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ ▶ Multi-sede │  │ ▶ Invita a   │  │ ▶ Documentos │                │
│  │   3 min      │  │   tu equipo  │  │   y táctico  │                │
│  │              │  │   2 min      │  │   2:30 min   │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. Sección 11 — TESTIMONIOS (prueba social)

**Titular:** **Clubes que ya dejaron el Excel atrás.**

> ⭐⭐⭐⭐⭐
> *"Teníamos 4 categorías en 4 Excel distintos. Ahora es una sola pantalla y, cuando un entrenador cancela por lluvia, me entero en el momento. No vuelvo atrás."*
> — **[Nombre]**, Director deportivo · [Club de 3 sedes y 8 equipos]

> ⭐⭐⭐⭐⭐
> *"Importé nuestra hoja de jugadores de tres temporadas y lo conectó todo solo. Pensé que tardaría una semana; fueron diez minutos."*
> — **[Nombre]**, Coordinador de cantera · [Academia]

> ⭐⭐⭐⭐⭐
> *"Mis entrenadores dejan las notas desde el campo con el móvil. Por fin sé qué pasa en cada entrenamiento sin perseguir a nadie."*
> — **[Nombre]**, Gerente de sede · [Club]

**Banda de logos:** *"Confían en SportApp"* + escudos de clubes (placeholder).

> *Rellenar con casos reales / beta-testers cuando los haya.*

---

## 14. Sección 12 — PRECIOS

**Titular:** **Precio simple. Sin sorpresas.**
**Subtítulo:** Empieza gratis. Crece cuando tu club crezca.

| 🌱 Club | 🚀 Multi-sede ★ Popular | 🏆 Federación |
|---|---|---|
| Para un club de una sede | Para clubes con varios centros | Para grupos y federaciones |
| 1 sede · equipos ilimitados | Sedes ilimitadas | Todo lo del plan Multi-sede |
| Jugadores y entrenadores ilimitados | Roles avanzados (gerente de sede) | Soporte dedicado + onboarding |
| Importación/exportación de Excel | Actividad en tiempo real | Personalización y SLA |
| Documentos y enlaces | Informes y filtros avanzados | Integraciones a medida |
| **Gratis para empezar** | **[Precio] /mes** | **A medida** |
| [ Empezar gratis ] | [ Probar 14 días ] | [ Hablar con ventas ] |

> Microcopy bajo la tabla: *Sin tarjeta para empezar. Cancela cuando quieras. Tus datos salen en Excel cuando los quieras — sin candados.*

---

## 15. Sección 13 — FAQ

**¿Tengo que meter todos mis datos a mano?**
No. Subes tu Excel actual (o pegas tu Google Sheets) y SportApp reconoce las columnas — aunque las llames distinto — y lo conecta todo. También hay plantilla si empiezas de cero.

**¿Puedo sacar mis datos cuando quiera?**
Sí. Exportas todo el club a Excel con un clic, con nombres legibles. Sin lock-in.

**¿Sirve para mi deporte?**
SportApp es agnóstico al deporte: fútbol, fútbol sala, baloncesto, balonmano, academias multideporte… Tú configuras las categorías, posiciones y parámetros.

**¿Funciona en el móvil?**
Sí, está pensada para usarse en el campo: navegación inferior en móvil y todo accesible desde el teléfono del entrenador.

**¿Cómo controlo quién ve qué?**
Con cinco roles y una matriz de permisos que distingue **ver** de **modificar**. Cada persona accede solo a lo suyo.

**¿Dónde están mis archivos?**
Donde quieras: súbelos a almacenamiento seguro de SportApp o enlaza tus recursos de Google Drive, YouTube o Vimeo. La app los mantiene asociados a su sede, equipo, ejercicio o sesión.

**¿Y si un entrenamiento se cancela?**
El entrenador lo marca como *No realizada* y deja el motivo (lluvia, lesión, falta de jugadores…). Aparece en el dashboard del admin y queda registrado en el histórico del club.

---

## 16. Sección 14 — CTA FINAL

```
        ┌───────────────────────────────────────────┐
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
- **CTA primario:** `Probar gratis` (→ `/register`) · **CTA secundario:** `Ver una demo`
- **Microcopy:** *Sin tarjeta · Importación de tu Excel incluida · Cancela cuando quieras*

---

## 17. Sección 15 — FOOTER

```
⚡ SportApp · ELITE MANAGEMENT
Elite Management para clubes deportivos

Producto            Recursos              Empresa            Legal
· Funciones         · Vídeos              · Sobre nosotros   · Privacidad
· Precios           · Guía de migración   · Contacto         · Términos
· Roadmap           · Centro de ayuda     · Blog             · Cookies
· Novedades         · Estado del servicio

                © 2026 SportApp — Gestión integral para clubes deportivos
```

---

## 18. Notas de implementación (para quien la monte)

- **Stack coherente con la app:** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind v4 + shadcn/ui + Framer Motion. Reutiliza los tokens de `globals.css` (§1) para identidad pixel-perfect.
  - **Lee primero `node_modules/next/dist/docs/`** (el proyecto usa Next.js 16 con breaking changes; no asumas Next 13–15).
- **Ruta sugerida:** la home pública en `src/app/page.tsx` (ya existe), separada del grupo autenticado `(dashboard)`. CTAs: "Probar gratis" → `/register`; "Entrar" → `/login`. Cierra el círculo web → app.
- **Componentes sugeridos:** `src/components/landing/` → `LandingNav`, `HeroSection`, `ProblemSection`, `SolutionGraph`, `ModulesTour`, `SessionNotesFeature` (estrella), `ComparisonTable`, `MigrationSection`, `MultiSedeSection`, `RolesMatrix`, `VideosSection`, `PricingSection`, `Testimonials`, `Faq`, `CtaSection`, `Footer`.
- **Capturas reales > mockups.** Usar pantallas verdaderas (ver Apéndice A): Dashboard semanal, `SesionDetalleDialog` (campo "Notas del entrenador"), Documentos tipo *enlace*, y el diálogo de importación con su parte de resultados.
- **Animación del momento estrella (§7):** el split-screen entrenador↔admin se ejecuta al hacer scroll (intersection observer). La tarjeta "🔴 No realizada · cancelada por lluvia" *aparece* en el lado admin con un fade-in.
- **Rendimiento y SEO:** `next/image` para todas las capturas (la app lo exige por norma — nada de `<img>`), lazy-load de la galería de vídeos, metadatos y Open Graph con la captura del dashboard.
- **Accesibilidad:** contraste AA (el azul `#3358ff` sobre blanco cumple), foco visible, vídeos con subtítulos en español.
- **Responsive:** impecable en móvil (375px) — coherente con que la app presume de uso en el campo (tiene bottom-nav).
- **TypeScript estricto, textos en español, sin `any`.** Seguir los patrones de `AGENTS.md`.

---

## Apéndice A — Capturas reales del producto (assets listos)

Dos juegos de capturas reales conviven en el repo. **Recomendación: usar `landing-assets/` como set principal** (curado para marketing, con la sesión recurrente y los diálogos de import/export) y `landing-screenshots/` para el recorrido de módulos.

**`landing-assets/` (set marketing — 8 tomas):**

| Archivo | Qué muestra | Dónde usarlo |
|---|---|---|
| `01-dashboard.png` | Dashboard semanal con calendario, días y filtros | Hero (§3) |
| `02-nueva-sesion.png` | Formulario de sesión con **programación recurrente** y ejercicios | Sesiones (§6.7) · Vídeos 3–4 |
| `03-export-excel.png` | Pestaña **Exportar a Excel** | Migración (§9) · Vídeo 11 |
| `04-import-excel-drive.png` | **Importar**: archivo + URL de Google Sheets/Drive + plantilla | Migración (§9) · Vídeo 2 |
| `05-documentos.png` | Tabla de documentos (tipo, categoría, tamaño, sedes) | Documentos (§6.8) · Vídeo 8 |
| `06-doc-archivo.png` | Alta de documento tipo **Archivo** + visibilidad por entrenador | Documentos (§6.8) |
| `07-doc-enlace.png` | Alta de documento tipo **Enlace** (YouTube/Vimeo/Drive/web) | Documentos (§6.8) · Vídeo 8 |
| `08-dashboard-movil.png` | Dashboard en móvil con **bottom-nav** | Sección responsive · vídeos móviles |

*Datos de demo:* `landing-assets/_gen-demo.cjs` (generador) y `landing-assets/demo-club.xlsx` (club de prueba para sembrar tomas ricas).

**`landing-screenshots/` (recorrido de módulos — 12 tomas):** `01-login`, `02-dashboard`, `03-sesiones`, `04-equipos`, `05-sedes`, `06-ejercicios`, `07-documentos`, `08-usuarios`, `09-parametros`, `10-configuracion`, `11-entrenadores`, `12-jugadores`.

> Para capturas con datos ricos (sesiones de colores, notas "cancelada por lluvia"), conviene **sembrar primero el club demo** con `_gen-demo.cjs` / `demo-club.xlsx`. La estructura y los flujos están verificados; solo falta poblar datos para las tomas de marketing.

---

## Apéndice B — Inventario de verdad del producto (para no prometer humo)

> Verificado **contra el código fuente** (tipos, servicios, componentes, `permisos.ts`, `globals.css`) en junio de 2026. Distinguir lo real de la visión es lo que mantiene honesta la grabación de vídeos.

### ✅ Existe hoy y se puede grabar/capturar
- **Dashboard semanal** con navegación por semanas, selector de día con contador, mini-calendario mensual y **filtros por sede / periodo / estado**.
- Módulos completos (tabla + búsqueda + formulario "Nuevo"): **Sedes, Equipos, Entrenadores, Jugadores, Usuarios, Ejercicios, Sesiones, Documentos, Parámetros**.
- **Estados de sesión** `Borrador` / `Planificada` / `Realizada` / `No realizada` con colores (ámbar/azul/esmeralda/rojo).
- **Notas / feedback post-entreno del entrenador** (`feedbackPostEntreno`) editable desde el detalle de sesión, **abrible desde el dashboard del admin**.
- **Programación recurrente de sesiones**: rango de fechas + días de la semana + **franjas horarias por día** + **previsualización** antes de confirmar.
- **Sesiones** con multi-entrenador (M:N), microciclo, periodo (Pretemporada/Competición), objetivo, observaciones previas, y ejercicios con orden/tiempo de ejecución/descanso/variante.
- **Ejercicios** global de club o propios de sede, con documentos adjuntos y nº mínimo de jugadores.
- **Documentos** tipo **archivo** (Storage seguro) o **enlace** (YouTube/Vimeo/Google Drive/web), con asociación **multi-sede / multi-equipo** y **visibilidad por entrenador** (todos o seleccionados).
- **Exportación a Excel** (1 hoja por entidad, referencias por nombre) e **importación desde `.xlsx` y desde URL de Google Sheets/Drive** con reconocimiento flexible de columnas (sinónimos), vinculación por nombre, **idempotencia** y **parte de resultados** por entidad/fila + **plantilla descargable**.
- **5 roles canónicos** (SuperAdmin, Admin, Gerente de sede, Entrenador, Jugador) con **matriz real `view`/`mutate`** por recurso (`permisos.ts`).
- **Multi-sede / multi-equipo** real (entrenadores y jugadores en varias sedes/equipos).
- **Selector de Club (workspace) + Sede** en la barra superior; **invitación de usuarios por enlace**; **onboarding** de alta de club.
- **App responsive** con **bottom-nav** móvil.
- **Campana de notificaciones** presente en la barra superior con **indicador rojo**.

### 🔭 Se presenta como visión/evolución (descrito como vivo en el copy de venta, en construcción técnica)
- El **feed de actividad en tiempo real**: al pulsar la campana, desplegar la lista de notas/estados y **empujar un aviso** al admin en el instante en que el entrenador guarda. Hoy existen el dato base (estado + nota) y el punto de entrada (la campana con su punto rojo); **el panel desplegable y el push son el siguiente paso**.
- El **badge "tiene notas"** señalizando la sesión en la lista del dashboard (hoy la nota se ve **al abrir** la sesión; resaltarla en la lista es la evolución natural).
- La **conexión nativa con Google Drive para *guardar* archivos** (`driveAdapter` definido como interfaz, aún sin implementar). Nota: la **importación desde Drive/Google Sheets sí es real hoy**.

> Para la landing de venta, estas tres se narran como parte de la experiencia (tú lo pediste así). Para grabar los vídeos, ceñirse a lo de la sección ✅ y rodar la capa 🔭 como mockup/animación hasta que esté implementada.

---

*Documento final consolidado el 5 de junio de 2026. Fusiona `LANDING_PAGE.md` + `landing-page.md`, corrige la paleta a los tokens reales (`#3358ff` / Geist Sans) y verifica cada afirmación contra el código del producto (manage-sport-app): tipos, servicios, componentes, matriz de permisos y CSS.*
