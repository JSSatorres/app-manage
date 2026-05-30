# SportApp — Design System

Referencia visual y de tokens para todos los componentes. El estilo es **minimalista**: blanco puro, acento azul único, hairlines en lugar de sombras, tipografía ligera.

---

## Tokens de color

| Token CSS / Tailwind | Valor (light) | Uso |
|---|---|---|
| `--primary` / `bg-primary` | `#3358ff` | Acento principal, botones CTA, íconos activos |
| `--background` / `bg-background` | `#ffffff` | Fondo de la app y páginas |
| `--foreground` / `text-foreground` | `#16181d` | Texto principal |
| `--secondary` / `bg-secondary` | `#f6f7f9` | Fondos de inputs, hover de filas |
| `--muted-foreground` / `text-muted-foreground` | `#9498a1` | Texto secundario, placeholders, labels |
| `--border` / `border-border` | `#ededf0` | Hairlines (bordes de tabla, separadores) |
| `--input` | `#e4e5e9` | Borde de inputs en foco |
| `--destructive` | `#ff5b52` | Rojo para eliminar/danger |
| `--card` / `bg-card` | `#ffffff` | Fondo de tarjetas y modales |
| `--sidebar` | `#fbfbfc` | Fondo del sidebar |
| `--sidebar-foreground` | `#5b5e66` | Texto de nav items sidebar |
| `--sidebar-primary` | `#3358ff` | Ítem activo en sidebar |

### Dark mode (clase `.dark`)

Las mismas variables pero con:
- `--background: #0a0a0c`, `--card: #111114`, `--border: #1f2024`
- El acento `#3358ff` se mantiene igual.

---

## Tipografía

- **Títulos de página** (`PageHeader`): `text-[27px] font-semibold tracking-[-0.03em]`
- **Subtítulo de página**: `text-[14px] font-medium text-muted-foreground`
- **Títulos de modal**: `text-[18px] font-semibold tracking-[-0.02em]` (font-display)
- **Labels de campo**: `text-[12.5px] font-semibold text-foreground/70`
- **Body / tabla**: `text-[14px]`
- **Nav sidebar**: `text-[14px] font-medium`
- **Labels de nav superior** (CLUB, SEDE): `text-[9px] font-semibold uppercase tracking-[0.1em]`

---

## Shell / Layout

### Sidebar (desktop md+)
- Fondo `bg-sidebar` (`#fbfbfc`), borde derecho `border-border`
- Ancho: `248px` expandido
- Brand: logo `bg-primary` 30×30 redondeado, nombre `text-[16px] font-semibold`, subtítulo `text-[9.5px] uppercase tracking-widest`
- Nav items: `px-3 py-2 rounded-lg text-[14px] font-medium`, activo → `bg-sidebar-accent text-sidebar-accent-foreground font-semibold` + ícono con `text-sidebar-primary`
- Footer: usuario con avatar 30×30 redondeado, nombre + rol

### TopBar (desktop)
- Altura `60px`, `border-b border-border bg-background px-[30px]`
- Searchbar: `rounded-[10px] border border-border bg-secondary/60` — se ilumina en foco con `ring-2 ring-primary/10`
- Context pills (Club/Sede): botón sin borde explícito, `hover:bg-secondary`, labels CLUB/SEDE en `9px uppercase`
- Botón Exportar: `bg-primary text-white rounded-[10px] px-[15px] py-[9px] text-[13.5px] font-semibold`
- Bell: icono con punto rojo `bg-destructive`
- Avatar: `size-[34px] rounded-lg border border-border`

### Header móvil
- Altura `54px`, mismo fondo/borde que topbar
- Logo + "SportApp" a la izquierda, pills de sede a la derecha

### Bottom Nav (móvil)
- `backdrop-filter: blur(16px)`, `border-t border-border`
- 4 items principales + "Más"
- Sheet desplegable desde abajo con `rounded-t-3xl`, secciones agrupadas con título uppercase `11.5px`
- Filas de sheet: ícono coloreado `38×38 rounded-[11px]`, texto `15px font-semibold`, chevron

---

## Componentes

### PageHeader
```tsx
<PageHeader title="Equipos" description="Equipos de la sede" action={<Button>Nuevo</Button>} />
```
- Título `text-[27px] font-semibold tracking-[-0.03em]`, separación inferior `mb-[30px]`
- Botón de acción: `bg-primary text-white rounded-[10px]`

---

### DataTable

#### Tabla (desktop)
- Sin contenedor con borde ni sombra — solo `border-b border-border` en cada fila
- `thead th`: `text-[12px] font-medium text-muted-foreground pb-[11px] px-[18px]`
- `tbody td`: `py-[18px] px-[18px] text-[14px]`, hover → `bg-secondary/40`
- Acciones de fila: visibles en hover del grupo (`group-hover`)

#### Toolbar (encima de la tabla)
- Searchbar `rounded-[10px] border border-border bg-secondary/60 w-[300px]`
- Chips de filtro: `rounded-lg px-[13px] py-[7px] text-[13px]`, activo → `bg-secondary font-semibold`
- Contador de resultados en `ml-auto text-[13px] text-muted-foreground`

#### Tarjetas móvil (`mobileCard`)
- `rounded-[14px] border border-border bg-card p-4`
- Usa `MobileCardRow` → monograma `42×42 rounded-[11px]`, título `15.5px font-semibold`
- Stats con `CardStat` (ícono + texto)
- Acciones con `CardAction` (flex-1, `rounded-[10px] border border-border min-h-[42px]`)

---

### Modal / Dialog

#### Estructura
```
┌─────────────────────────────┐
│ modal-head: monograma + título + X  │  border-b border-border
├─────────────────────────────┤
│ modal-body: form-grid 2 cols        │  padding 22px, overflow-y-auto
├─────────────────────────────┤
│ modal-foot: Cancelar ··· Guardar    │  border-t border-border
└─────────────────────────────┘
```

- Overlay: `bg-black/[0.45] backdrop-blur-[3px]`
- Modal: `bg-card rounded-[20px] border border-border max-w-[600px]`
- En móvil: `rounded-t-[24px] rounded-b-none` desde abajo (sheet)
- Sin sombras pesadas

#### Campos (field)
- Label: `text-[12.5px] font-semibold text-foreground/70` + `*` de requerido en `text-primary`
- Input: `rounded-[11px] border border-input bg-secondary/60 px-[13px] py-[11px] text-[14px]`
- En foco: `border-primary ring-2 ring-primary/12 bg-background`
- Select: mismo estilo que input + chevron SVG a la derecha

#### Grid de campos
- 2 columnas en desktop: `grid grid-cols-2 gap-x-[14px] gap-y-[16px]`
- Columna completa: `col-span-2`
- Sección (separador): `text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-bold`, con `border-t border-border pt-[16px] col-span-2`

#### Pie del modal
- Botón Cancelar: `bg-transparent border border-input text-foreground rounded-[10px] px-[20px] py-[11px]`
- Botón Guardar: `bg-primary text-white rounded-[10px] px-[20px] py-[11px] font-semibold`

---

### MultiCheckboxList (acorde­ón de selección)
- Contenedor: `max-h-44 overflow-y-auto rounded-[11px] border border-border bg-secondary/40 p-2`
- Cada fila: `flex items-center gap-2 py-[5px]`
- Checkbox estilizado con `accent-color: var(--primary)`
- Label: `text-[14px] font-medium cursor-pointer`

---

### Badge / Estado

```tsx
// Con color de categoría (punto + texto)
<span style={{ color: `color-mix(in srgb, ${color} 48%, var(--foreground))` }}>
  <span style={{ background: color }} className="size-[7px] rounded-full" />
  {label}
</span>

// Soft (sin color)
<span className="rounded-[7px] border border-border text-muted-foreground px-[9px] py-[3px] text-[12.5px]">
  {label}
</span>

// Estado coloreado (sesiones, roles)
<span className="rounded-[7px] px-[10px] py-[4px] text-[12.5px] font-semibold" style={{ background, color }}>
  {estado}
</span>
```

---

### Monograma (avatar inicial)
- Tamaño base: `size-[36px] rounded-[9px]`
- Tarjeta móvil: `size-[42px] rounded-[11px]`
- Modal head: `size-[44px] rounded-[12px]`
- Fondo: `color-mix(in srgb, {color} 13%, var(--card))`, texto: `color-mix(in srgb, {color} 62%, var(--foreground))`

---

## Patrones de interacción

| Patrón | Implementación |
|---|---|
| Hover fila tabla | `bg-secondary/40` + acciones de fila aparecen con `opacity-0 group-hover:opacity-100` |
| Hover nav item | `bg-sidebar-accent/60` |
| Focus input | `ring-2 ring-primary/10 border-input bg-background` |
| Active card móvil | `active:bg-secondary/60` |
| Modal open | `animate-in fade-in-0 zoom-in-95` |
| Chip activo | `bg-secondary font-semibold text-foreground` |

---

## Radios de esquina

| Elemento | Radio |
|---|---|
| Botones principales | `rounded-[10px]` |
| Inputs / Selects | `rounded-[11px]` |
| Monogramas (tabla) | `rounded-[9px]` |
| Monogramas (tarjeta) | `rounded-[11px]` |
| Modales | `rounded-[20px]` |
| Modales móvil (sheet) | `rounded-t-[24px]` |
| Nav items sidebar | `rounded-lg` (8px) |
| Chips de filtro | `rounded-lg` (8px) |
| Tarjetas móvil | `rounded-[14px]` |
| Bottom sheet secciones | `rounded-[15px]` |

---

## Espaciado clave

| Área | Valor |
|---|---|
| Content desktop padding | `px-[30px] py-[38px]` |
| Content móvil padding | `px-4 py-[20px] pb-[100px]` |
| Gap entre filas de tabla | `border-b border-border` |
| Separación PageHeader | `mb-[30px]` |
| Gap toolbar items | `gap-[14px]` |
| Padding modal body/head/foot | `22px` |
| Gap form-grid | `gap-x-[14px] gap-y-[16px]` |
