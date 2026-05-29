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
  filterChips?: string[]
  activeChip?: string
  onChipChange?: (chip: string) => void
}

type SortDirection = "asc" | "desc" | null

export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = "Buscar...",
  pageSize = 10,
  emptyTitle = "Sin resultados",
  emptyDescription,
  onRowClick,
  rowKey,
  mobileCard,
  filterChips,
  activeChip,
  onChipChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [page, setPage] = useState(0)

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

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) => prev === "asc" ? "desc" : prev === "desc" ? null : "asc")
      if (sortDirection === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
    setPage(0)
  }

  if (loading) return <LoadingSpinner className="py-16" text="Cargando datos..." />

  return (
    <div className="space-y-[18px]">
      {/* Toolbar: búsqueda + chips + contador */}
      {(searchable || filterChips) && (
        <div className="flex items-center gap-[14px] flex-wrap">
          {searchable && (
            <div className="relative w-[300px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
              <input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className={cn(
                  "w-full rounded-[10px] border border-border bg-secondary/60 py-[9px] pl-[40px] pr-[14px]",
                  "text-[13.5px] text-foreground placeholder:text-muted-foreground",
                  "outline-none transition-all focus:border-input focus:bg-background focus:ring-2 focus:ring-primary/10"
                )}
              />
            </div>
          )}

          {filterChips && filterChips.length > 0 && (
            <div className="flex gap-[7px] flex-nowrap overflow-x-auto">
              {filterChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChipChange?.(chip)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-[13px] py-[7px] text-[13px] font-medium transition-colors",
                    activeChip === chip
                      ? "bg-secondary font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          <span className="ml-auto text-[13px] font-medium text-muted-foreground whitespace-nowrap">
            {sortedData.length} resultado{sortedData.length !== 1 && "s"}
          </span>
        </div>
      )}

      {sortedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          {/* Cards en móvil */}
          {mobileCard && (
            <div className="md:hidden flex flex-col gap-[14px]">
              {pagedData.map((row) => (
                <div
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "rounded-[14px] border border-border bg-card p-4 transition-colors",
                    onRowClick && "cursor-pointer active:bg-secondary/60"
                  )}
                >
                  {mobileCard(row)}
                </div>
              ))}
            </div>
          )}

          {/* Tabla en desktop — sin bordes de contenedor, solo hairlines */}
          <div className={cn(mobileCard && "hidden md:block")}>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "pb-[11px] px-[18px] text-[12px] font-medium text-muted-foreground whitespace-nowrap bg-transparent",
                        col.className
                      )}
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="inline-flex items-center gap-[5px] hover:text-foreground/80 transition-colors"
                        >
                          {col.header}
                          {sortKey === col.key ? (
                            sortDirection === "asc"
                              ? <ChevronUp size={12} className="opacity-60" />
                              : <ChevronDown size={12} className="opacity-60" />
                          ) : (
                            <ChevronDown size={12} className="opacity-40" />
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
                    className={cn(
                      "border-b border-border transition-colors hover:bg-secondary/40 group",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn("py-[var(--row-pad,18px)] px-[18px] text-[14px]", col.className)}
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
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] text-muted-foreground">
                {sortedData.length} resultado{sortedData.length !== 1 && "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="h-7 w-7 p-0 border-border rounded-lg"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-[13px] text-muted-foreground px-1">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="h-7 w-7 p-0 border-border rounded-lg"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
