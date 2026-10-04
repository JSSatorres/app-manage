"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search } from "lucide-react"
import { EmptyState } from "./EmptyState"
import { LoadingSpinner } from "./LoadingSpinner"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  accessor?: (row: T) => string | number | null
  className?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  rowKey: (row: T) => string
  mobileCard?: (row: T) => React.ReactNode
  mobileCardActions?: (row: T) => React.ReactNode
  filterChips?: string[]
  activeChip?: string
  onChipChange?: (chip: string) => void
  searchAdornment?: React.ReactNode
  /**
   * Paginación server-side (opcional, no rompe el modo cliente por defecto).
   * Si se pasa `onPageChange`, la tabla asume que `data` ya viene paginada
   * desde el servicio/hook (con `.range()`) y delega la navegación al padre
   * en vez de paginar en cliente. `page` es 0-indexado y `total` es el total
   * de filas remoto (para calcular cuántas páginas hay).
   *
   * Nota: en este modo, la búsqueda/orden de la tabla solo actúan sobre las
   * filas ya cargadas (la página actual), no sobre el total remoto — no hay
   * búsqueda server-side implementada.
   */
  page?: number
  total?: number
  onPageChange?: (page: number) => void
}

type SortDirection = "asc" | "desc" | null

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = "Buscar...",
  pageSize = 15,
  emptyTitle = "Sin resultados",
  emptyDescription,
  onRowClick,
  rowKey,
  mobileCard,
  mobileCardActions,
  filterChips,
  activeChip,
  onChipChange,
  searchAdornment,
  page: controlledPage,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [clientPage, setClientPage] = useState(0)

  const isServerPaged = typeof onPageChange === "function"
  const currentPage = isServerPaged ? controlledPage ?? 0 : clientPage

  const filteredData = useMemo(() => {
    if (!search) return data
    const lowerSearch = search.toLowerCase()
    return data.filter((row) =>
      columns.some((col) => {
        const value = col.accessor
          ? col.accessor(row)
          : (row as Record<string, unknown>)[col.key]
        return String(value ?? "").toLowerCase().includes(lowerSearch)
      }),
    )
  }, [data, search, columns])

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filteredData
    return [...filteredData].sort((a, b) => {
      const aVal = col.accessor ? col.accessor(a) : (a as Record<string, unknown>)[col.key]
      const bVal = col.accessor ? col.accessor(b) : (b as Record<string, unknown>)[col.key]
      const result = String(aVal ?? "").localeCompare(String(bVal ?? ""), "es", { numeric: true })
      return sortDirection === "asc" ? result : -result
    })
  }, [filteredData, sortKey, sortDirection, columns])

  const totalCount = isServerPaged ? total ?? 0 : sortedData.length
  const totalPages = isServerPaged
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : Math.ceil(sortedData.length / pageSize)
  // En modo server, `data` ya viene paginada desde el servicio/hook.
  const pagedData = isServerPaged ? sortedData : sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) => prev === "asc" ? "desc" : prev === "desc" ? null : "asc")
      if (sortDirection === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
    if (!isServerPaged) setClientPage(0)
  }

  function goToPage(next: number) {
    if (isServerPaged) onPageChange?.(next)
    else setClientPage(next)
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <LoadingSpinner className="py-14" text="Cargando datos..." />
      </div>
    )
  }

  const showToolbar = searchable || Boolean(filterChips)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      {/* Toolbar: búsqueda + chips + contador */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          {searchable && (
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  aria-label={searchPlaceholder}
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); if (!isServerPaged) setClientPage(0) }}
                  className={cn(
                    "h-9 w-full rounded-lg border border-border bg-muted/60 pl-9 pr-3",
                    "text-[13.5px] text-foreground placeholder:text-muted-foreground",
                    "outline-none transition-all focus:border-ring focus:bg-card focus:ring-3 focus:ring-ring/15"
                  )}
                />
              </div>
              {searchAdornment}
            </div>
          )}

          {filterChips && filterChips.length > 0 && (
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted/70 p-0.5" role="group" aria-label="Filtros">
              {filterChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  aria-pressed={activeChip === chip}
                  onClick={() => onChipChange?.(chip)}
                  className={cn(
                    "h-8 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors",
                    activeChip === chip
                      ? "bg-card font-semibold text-foreground shadow-card"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <span
            className="ml-auto inline-flex h-6 items-center whitespace-nowrap rounded-full bg-secondary px-2.5 text-[12px] font-medium text-muted-foreground tabular-nums"
            aria-live="polite"
          >
            {totalCount} resultado{totalCount !== 1 && "s"}
          </span>
        </div>
      )}

      {sortedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} className="rounded-none border-0 bg-transparent py-12" />
      ) : (
        <>
          {/* Lista compacta en móvil */}
          {mobileCard && (
            <div className="divide-y divide-border md:hidden">
              {pagedData.map((row) => {
                const actions = mobileCardActions?.(row)
                const card = mobileCard(row)
                const cardKey = rowKey(row)
                const onCardKeyDown = onRowClick
                  ? (e: React.KeyboardEvent<HTMLDivElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined

                if (actions) {
                  return (
                    <div key={cardKey} className="px-3 py-3 transition-colors">
                      <div
                        onClick={() => onRowClick?.(row)}
                        onKeyDown={onCardKeyDown}
                        role={onRowClick ? "button" : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        className={cn(
                          "-m-1 rounded-lg p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          onRowClick && "cursor-pointer active:bg-muted"
                        )}
                      >
                        {card}
                      </div>
                      <div
                        role="group"
                        aria-label="Acciones de la tarjeta"
                        className="mt-2.5 flex items-center gap-2 pl-[52px]"
                      >
                        {actions}
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={cardKey}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={onCardKeyDown}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      "px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      onRowClick && "cursor-pointer active:bg-muted"
                    )}
                  >
                    {card}
                  </div>
                )
              })}
            </div>
          )}

          {/* Tabla en desktop — filas compactas para ver más datos sin scroll */}
          <div className={cn(mobileCard && "hidden md:block")}>
            <Table aria-label="Resultados">
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/50 hover:bg-muted/50">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      scope="col"
                      aria-sort={
                        col.sortable
                          ? sortKey === col.key
                            ? sortDirection === "asc"
                              ? "ascending"
                              : sortDirection === "desc"
                                ? "descending"
                                : "none"
                            : "none"
                          : undefined
                      }
                      className={cn(
                        "h-9 px-4 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground whitespace-nowrap",
                        col.key === "acciones" && "w-px text-right",
                        col.className
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className={cn(
                            "inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground",
                            sortKey === col.key && "text-foreground"
                          )}
                        >
                          {col.header}
                          {sortKey === col.key ? (
                            sortDirection === "asc"
                              ? <ChevronUp size={13} className="text-primary" />
                              : <ChevronDown size={13} className="text-primary" />
                          ) : (
                            <ChevronDown size={13} className="opacity-40" />
                          )}
                        </button>
                      ) : col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedData.map((row) => (
                  <TableRow
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onRowClick(row)
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      "group border-b border-border/70 transition-colors hover:bg-muted/50",
                      onRowClick && "cursor-pointer focus-visible:bg-accent focus-visible:outline-none"
                    )}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          "py-[var(--row-pad,10px)] px-4 text-[13.5px] text-foreground/85",
                          colIndex === 0 && "font-medium text-foreground",
                          col.key === "acciones" && "w-px text-right",
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row)
                          : String((col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key]) ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2">
              <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
                {totalCount} resultado{totalCount !== 1 && "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Página anterior"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft size={15} />
                </Button>
                <span className="min-w-12 px-1 text-center text-[12.5px] font-medium tabular-nums text-muted-foreground" aria-live="polite">
                  {currentPage + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Página siguiente"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                >
                  <ChevronRight size={15} />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
