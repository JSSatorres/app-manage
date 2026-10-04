"use client"

import * as React from "react"
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight } from "lucide-react"
import type { DayButtonProps } from "react-day-picker"
import { es } from "react-day-picker/locale"

import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type CalendarViewMode = "week" | "month"

interface DashboardCalendarNavigatorProps {
  activeDay: string
  weekDays: string[]
  weekRange: string
  sessionCountByDay: ReadonlyMap<string, number>
  onDateChange: (day: string) => void
  /** Contenido opcional (vista previa de sesiones) que se pinta dentro de cada día en md+. */
  renderDayPreview?: (day: string) => React.ReactNode
}

const SessionCountContext = React.createContext<ReadonlyMap<string, number>>(
  new Map(),
)

function fromLocalIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)

  return new Date(year, month - 1, day)
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)

  return nextDate
}

function addMonths(date: Date, months: number) {
  const targetMonth = date.getMonth() + months
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12)
  const normalizedMonth = ((targetMonth % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()

  return new Date(targetYear, normalizedMonth, Math.min(date.getDate(), lastDay))
}

function isSameLocalDay(firstDate: Date, secondDate: Date) {
  return toLocalIsoDate(firstDate) === toLocalIsoDate(secondDate)
}

function formatSessionCount(count: number) {
  return `${count} ${count === 1 ? "sesión" : "sesiones"}`
}

function SessionCountChip({
  count,
  selected = false,
  onPrimary = false,
}: {
  count: number
  selected?: boolean
  /** El chip se pinta sobre un fondo `primary` (día seleccionado del mes). */
  onPrimary?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="session-count-chip"
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
        selected && onPrimary
          ? "bg-primary-foreground text-primary"
          : selected
            ? "bg-primary text-primary-foreground"
            : "bg-primary/12 text-primary",
      )}
    >
      {count}
    </span>
  )
}

function DashboardMonthDayButton({
  day,
  modifiers,
  children,
  ...buttonProps
}: DayButtonProps) {
  const sessionCountByDay = React.useContext(SessionCountContext)
  const sessionCount = sessionCountByDay.get(toLocalIsoDate(day.date)) ?? 0
  const fallbackLabel = day.date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const dateLabel = buttonProps["aria-label"] ?? fallbackLabel

  return (
    <CalendarDayButton
      {...buttonProps}
      day={day}
      modifiers={modifiers}
      locale={es}
      aria-label={`${dateLabel}${
        sessionCount > 0 ? `, ${formatSessionCount(sessionCount)}` : ""
      }`}
    >
      {children}
      {sessionCount > 0 ? (
        <SessionCountChip count={sessionCount} selected={modifiers.selected} onPrimary />
      ) : null}
    </CalendarDayButton>
  )
}

export function DashboardCalendarNavigator({
  activeDay,
  weekDays,
  weekRange,
  sessionCountByDay,
  onDateChange,
  renderDayPreview,
}: DashboardCalendarNavigatorProps) {
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("week")
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const activeDate = fromLocalIsoDate(activeDay)
  const today = new Date()
  const isWeekView = viewMode === "week"

  const handlePrevious = () => {
    const previousDate = isWeekView
      ? addDays(activeDate, -7)
      : addMonths(activeDate, -1)

    onDateChange(toLocalIsoDate(previousDate))
  }

  const handleNext = () => {
    const nextDate = isWeekView
      ? addDays(activeDate, 7)
      : addMonths(activeDate, 1)

    onDateChange(toLocalIsoDate(nextDate))
  }

  const handleDaySelect = (date: Date | undefined) => {
    if (!date) return

    onDateChange(toLocalIsoDate(date))
    setIsDatePickerOpen(false)
  }

  return (
    <section className="space-y-3" aria-label="Navegación del calendario">
      <div className="flex flex-wrap items-center gap-2">
        {/* Control segmentado: anterior · rango · siguiente */}
        <div className="flex min-w-0 items-center rounded-lg border border-border bg-card shadow-card">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-r-none"
            aria-label={isWeekView ? "Semana anterior" : "Mes anterior"}
            onClick={handlePrevious}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>

          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 min-w-0 rounded-none border-x border-border px-2.5 font-semibold text-foreground tabular-nums sm:px-3",
              )}
              aria-label={`Elegir fecha: ${weekRange}`}
              onClick={() => setIsDatePickerOpen(true)}
            >
              <CalendarDays aria-hidden="true" className="hidden text-primary sm:block" />
              <span className="truncate">{weekRange}</span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={es}
                month={activeDate}
                selected={activeDate}
                onSelect={handleDaySelect}
                captionLayout="dropdown"
                startMonth={new Date(2000, 0)}
                endMonth={new Date(2100, 11)}
                styles={{ dropdown: { opacity: 1 } }}
              />
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-l-none"
            aria-label={isWeekView ? "Semana siguiente" : "Mes siguiente"}
            onClick={handleNext}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => onDateChange(toLocalIsoDate(today))}
        >
          Hoy
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("ml-auto", !isWeekView && "border-primary/40 bg-accent text-accent-foreground")}
          aria-label={isWeekView ? "Ver calendario mensual" : "Ver semana"}
          aria-pressed={!isWeekView}
          onClick={() => setViewMode(isWeekView ? "month" : "week")}
        >
          {isWeekView ? <CalendarRange aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
        </Button>
      </div>

      {isWeekView ? (
        <div
          className="grid grid-cols-7 gap-1 md:gap-2"
          aria-label="Días de la semana"
        >
          {weekDays.map((day) => {
            const date = fromLocalIsoDate(day)
            const isActive = day === activeDay
            const isToday = isSameLocalDay(date, today)
            const sessionCount = sessionCountByDay.get(day) ?? 0
            const dateLabel = date.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            const preview = renderDayPreview?.(day)

            return (
              <button
                key={day}
                type="button"
                className={cn(
                  "group/day flex min-h-[68px] min-w-0 flex-col items-center gap-1 rounded-xl border bg-card px-1 py-2 text-sm shadow-card transition-all hover:border-primary/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  preview && "md:min-h-[156px] md:items-stretch md:px-2 md:text-left",
                  isActive
                    ? "border-primary bg-accent ring-2 ring-primary/15"
                    : "border-border",
                )}
                aria-pressed={isActive}
                aria-label={`${dateLabel}${
                  sessionCount > 0 ? `, ${formatSessionCount(sessionCount)}` : ""
                }`}
                onClick={() => onDateChange(day)}
              >
                <span className={cn("flex flex-col items-center gap-0.5", preview && "md:flex-row md:items-center md:justify-between md:gap-1")}>
                  <span className={cn(
                    "text-[10.5px] font-semibold uppercase tracking-[0.04em]",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}>
                    {date.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}
                  </span>
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-[15px] font-semibold tabular-nums",
                      isToday ? "bg-primary text-primary-foreground" : isActive ? "text-primary" : "text-foreground",
                    )}
                  >
                    {date.getDate()}
                  </span>
                </span>
                {sessionCount > 0 ? (
                  <span className={cn(preview && "md:hidden")}>
                    <SessionCountChip count={sessionCount} selected={isActive} />
                  </span>
                ) : null}
                {preview ? (
                  <span className="mt-1 hidden min-w-0 flex-1 flex-col gap-1 md:flex">{preview}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        <SessionCountContext.Provider value={sessionCountByDay}>
          <div className="max-w-full overflow-x-auto pb-1">
            <Calendar
              className="w-full min-w-fit rounded-xl border border-border bg-card p-3 shadow-card [--cell-size:2.75rem] md:[--cell-size:3.25rem]"
              aria-label="Calendario mensual"
              mode="single"
              locale={es}
              month={activeDate}
              selected={activeDate}
              onSelect={handleDaySelect}
              captionLayout="dropdown"
              startMonth={new Date(2000, 0)}
              endMonth={new Date(2100, 11)}
              components={{ DayButton: DashboardMonthDayButton }}
            />
          </div>
        </SessionCountContext.Provider>
      )}
    </section>
  )
}
