# SportApp — Design System «Pista»

Referencia visual y de tokens para todos los componentes. Sustituye a «Banquillo editorial» desde el
04/10/2026. Objetivos: aspecto moderno y visual, coherencia entre secciones, **mobile-first** y
**máxima densidad de información** (ver lo importante sin scroll).

Principios:

1. **Base fría y limpia, acento índigo.** Fondo gris azulado muy claro, tarjetas blancas, rail
   lateral azul noche. El color se reserva para significado (estado, categoría, sección).
2. **Tarjetas redondeadas con sombra mínima** (`rounded-xl` + `shadow-card`), nunca bordes negros
   gruesos ni esquinas cuadradas.
3. **Densidad**: filas de tabla de ~44 px, cabeceras compactas con icono, KPIs en rejilla de 2
   (móvil) / 4-5 (escritorio) columnas, acciones de fila solo con icono.
4. **Cada sección tiene un color** (`sectionTones` / `sectionIconColors`) que se repite en su icono
   de cabecera, en el sidebar, en la barra inferior y en su mosaico del menú móvil.
5. **Nunca scroll horizontal en móvil.** Toda tabla se convierte en tarjetas por debajo de `md`
   (o `lg`/`xl` si es muy ancha) y las pestañas pasan a cuadrícula de 2 columnas.

---

## Tokens de color (`src/app/globals.css`)

| Token | Light | Uso |
|---|---|---|
| `background` | `#f5f7fb` | Fondo de la app |
| `foreground` | `#0f172a` | Texto principal |
| `card` / `popover` | `#ffffff` | Tarjetas, tablas, modales, menús |
| `primary` | `#4f46e5` | CTA, foco, selección, día activo |
| `secondary` / `muted` | `#eef1f6` / `#f1f4f9` | Fondos neutros, cabecera de tabla, chips |
| `muted-foreground` | `#5c677d` | Texto secundario (AA sobre `background`) |
| `accent` | `#eef2ff` | Fila/filtro seleccionado, hover de menús |
| `destructive` | `#e11d48` | Eliminar, vencido, «No realizada» |
| `success` | `#047857` | Realizada, activo, bloque en curso |
| `warning` | `#b45309` | Pendiente, avisos |
| `info` | `#0369a1` | Planificada, Google Drive, global |
| `border` / `input` | `#e2e7ef` / `#d4dbe6` | Bordes de tarjeta / campos |
| `chart-1…8` | índigo, cielo, esmeralda, ámbar, rosa, violeta, turquesa, naranja | Categorías, monogramas, secciones |
| `sidebar*` | `#0c1222` + `#818cf8` | Rail lateral oscuro con acento índigo claro |

El tema `.dark` define los mismos tokens (no hay conmutador activo todavía). Sombras: `shadow-card`
(tarjetas) y `shadow-float` (diálogos, popovers, menús). Radios: `--radius: 0.625rem` con escala
`sm`(6) · `md`(8) · `lg`(10) · `xl`(14) · `2xl`(18).

Tintes: los fondos de estado/categoría usan el token con opacidad (`bg-success/10 text-success`,
`bg-chart-3/12 text-chart-3`). El color nunca va solo: siempre acompaña a texto o `aria-label`.

## Tipografía

Geist para todo (títulos incluidos, `--font-heading`). Título de página 21–23 px semibold
`tracking-[-0.02em]`; títulos de tarjeta 15 px semibold; cuerpo de tabla 13.5 px; cabeceras de tabla
11.5 px uppercase; etiquetas de formulario 12.5 px medium.

---

## Shell

- **Sidebar (md+)**: 15 rem, azul noche, grupos «Operativa / Club / Administración», ítems `h-9
  rounded-lg`; activo = fondo `sidebar-accent` + barra izquierda índigo + icono `sidebar-primary`.
  Colapsable a iconos (3.75 rem). El ancho se define en `SidebarProvider` (layout), no en `Sidebar`.
- **TopBar (md+)**: `h-14`, sticky, `bg-card/85 backdrop-blur`. Pastillas Club/Sede con icono de
  color, campana y avatar circular con degradado.
- **Header móvil**: `h-14`, sticky, logo + selector de sede.
- **Iconos de navegación en color**: cada ítem del sidebar y de la barra inferior usa el color de su
  sección; el activo añade un tinte `bg-current/12–15`.
- **BottomNav (móvil)**: barra translúcida; el ítem activo lleva una «pill» tintada de su color. «Más»
  abre una hoja con **mosaicos en cuadrícula de 3** (todas las secciones sin scroll) + Perfil/Salir.
- **Contenido**: `px-4 pt-4 pb-24` móvil · `md:px-6 md:pt-5` · `xl:px-8`.

## Componentes compartidos

| Componente | Uso |
|---|---|
| `PageHeader` | `title`, `description?`, `action?`, **`icon` + `tone`** (de `sectionTones`), `meta?`. El título envuelve bajo las acciones en móvil. |
| `DataTable` | Tarjeta única: barra (búsqueda + chips segmentados + contador) → tabla compacta (cabecera `bg-muted/50`, primera columna en negrita, columna `acciones`/`actions` alineada a la derecha) → paginación. `pageSize` por defecto 15. **Móvil**: con `mobileCard`, lista de tarjetas; sin él, cada fila se **apila** (título arriba, acciones arriba a la derecha, resto como etiqueta/valor en 2 columnas). `cardsBelow="lg"\|"xl"` usa las tarjetas hasta ese ancho en tablas anchas. Columnas: `grow` (ocupa el sobrante y trunca), `hideBelow` (oculta en tabla estrecha), `mobile: "full"\|"hidden"`. |
| `MobileCardRow` | Fila móvil: monograma 40 px con color derivado del título (o `iconColor`), título, meta, badge, `stats` y acciones alineadas al texto. |
| `RowActionButton` / `RowActions` | Acciones de fila solo icono con color: `tone` `primary` (editar, por defecto), `info` (ver), `success`, `danger` (eliminar), `neutral`. El texto va en `aria-label`/`title`; detiene la propagación. |
| `StatCard` | KPI: icono tintado + etiqueta + valor grande + pista (oculta en móvil) + `children` (mini gráfico). |
| `ColorTag` | Etiqueta con color estable por texto (categorías, posiciones, sedes). |
| `Monogram` / `NameCell` | Avatar de iniciales con color estable; `NameCell` para la columna de nombre. |
| `EstadoSesionBadge` | Estados de sesión: Planificada (`info`), Realizada (`success`), Borrador (neutro), No realizada (`destructive`). `ESTADO_SESION_DOT` para puntos/barras. |
| `EmptyState` | Tarjeta discontinua con icono índigo. |

## Pantallas clave

- **Dashboard**: filtros en la cabecera → 4 KPIs de la semana (total con barra por estado,
  planificadas, realizadas con % de cumplimiento, equipos activos) → tablero semanal de 7 columnas
  con vista previa de sesiones dentro de cada día (md+) + panel del día seleccionado.
- **Listados** (Equipos, Entrenadores, Jugadores, Usuarios, Ejercicios, Sesiones, Parámetros):
  `PageHeader` con icono + `DataTable` densa con monogramas, `ColorTag` y acciones de icono.
- **Sedes**: acordeón en tarjetas; equipos como subtarjetas con sesiones y miembros en dos columnas.
- **Economía**: banner Stripe compacto, pestañas, filtros en una fila y 5 KPIs con icono.
- **Documentos**: lista a la izquierda y cuota de almacenamiento fija a la derecha (lg+).
- **Configuración / Perfil**: tarjetas en dos columnas en escritorio.

## Formularios y diálogos

- Diálogo: `rounded-2xl`, `shadow-float`, cabecera `px-5 py-4`, pie `bg-muted/50`; en móvil hoja
  inferior con esquinas superiores redondeadas.
- Campos `h-9 rounded-lg bg-card`, foco `border-ring ring-3 ring-ring/20`. Etiqueta `FormField` en
  12.5 px; requerido con `*` en `destructive`. `FormSection` = rótulo uppercase + línea.

## Interacción y accesibilidad

Foco visible con `ring`; objetivos táctiles ≥ 36 px (32 px en acciones de fila de escritorio);
`prefers-reduced-motion` desactiva transiciones; la hoja «Más» cerrada es `invisible` para no recibir
foco.
