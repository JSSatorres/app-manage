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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react"
import { EmptyState } from "./EmptyState"
import { LoadingSpinner } from "./LoadingSpinner"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  accessor?: (row: T) => string | number | null
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
        return String(value ?? "")
          .toLowerCase()
          .includes(lowerSearch)
      }),
    )
  }, [data, search, columns])

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData
    const col = columns.find((c) => c.key === sortKey)
    if (!col) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = col.accessor
        ? col.accessor(a)
        : (a as Record<string, unknown>)[col.key]
      const bVal = col.accessor
        ? col.accessor(b)
        : (b as Record<string, unknown>)[col.key]

      const aStr = String(aVal ?? "")
      const bStr = String(bVal ?? "")
      const result = aStr.localeCompare(bStr, "es", { numeric: true })
      return sortDirection === "asc" ? result : -result
    })
  }, [filteredData, sortKey, sortDirection, columns])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize)

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDirection((prev) =>
        prev === "asc" ? "desc" : prev === "desc" ? null : "asc",
      )
      if (sortDirection === "desc") setSortKey(null)
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
    setPage(0)
  }

  if (loading) {
    return <LoadingSpinner className="py-16" text="Cargando datos..." />
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={14}
          />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            className="pl-9 h-9 bg-muted/40 border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 rounded-lg"
          />
        </div>
      )}

      {sortedData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="rounded-xl border border-border/60 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground py-3.5 px-4"
                    >
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {col.header}
                          <ArrowUpDown
                            size={12}
                            className={cn(
                              sortKey === col.key && "text-primary",
                            )}
                          />
                        </button>
                      ) : (
                        col.header
                      )}
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
                      "border-b border-border/40 transition-colors hover:bg-muted/20",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className="py-3.5 px-4 text-sm">
                        {col.render
                          ? col.render(row)
                          : String(
                              (row as Record<string, unknown>)[col.key] ?? "",
                            )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {sortedData.length} resultado{sortedData.length !== 1 && "s"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="h-7 w-7 p-0 border-border/60 rounded-lg"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="h-7 w-7 p-0 border-border/60 rounded-lg"
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
