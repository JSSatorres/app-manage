"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
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
}: {
  count: number
  selected?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="session-count-chip"
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
        selected
          ? "border-primary-foreground/40 bg-primary-foreground text-foreground"
          : "border-primary/35 bg-primary/10 text-foreground",
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
        <SessionCountChip count={sessionCount} selected={modifiers.selected} />
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
    <section className="space-y-4" aria-label="Navegación del calendario">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={isWeekView ? "Semana anterior" : "Mes anterior"}
          onClick={handlePrevious}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>

        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger
            className={cn(buttonVariants({ variant: "outline" }), "h-11")}
            aria-label={`Elegir fecha: ${weekRange}`}
            onClick={() => setIsDatePickerOpen(true)}
          >
            {weekRange}
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
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={isWeekView ? "Semana siguiente" : "Mes siguiente"}
          onClick={handleNext}
        >
          <ChevronRight aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-11"
          onClick={() => onDateChange(toLocalIsoDate(today))}
        >
          Hoy
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-label={isWeekView ? "Ver calendario mensual" : "Ver semana"}
          aria-pressed={!isWeekView}
          onClick={() => setViewMode(isWeekView ? "month" : "week")}
        >
          <CalendarDays aria-hidden="true" />
        </Button>
      </div>

      {isWeekView ? (
        <div
          className="grid grid-cols-7 gap-px overflow-hidden border border-border bg-border"
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

            return (
              <button
                key={day}
                type="button"
                className={cn(
                  "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 bg-background px-1 py-2 text-sm transition-colors hover:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                  isToday && !isActive && "bg-muted font-semibold",
                )}
                aria-pressed={isActive}
                aria-label={`${dateLabel}${
                  sessionCount > 0 ? `, ${formatSessionCount(sessionCount)}` : ""
                }`}
                onClick={() => onDateChange(day)}
              >
                <span className="text-xs uppercase">
                  {date.toLocaleDateString("es-ES", { weekday: "short" })}
                </span>
                <span>{date.getDate()}</span>
                {sessionCount > 0 ? (
                  <SessionCountChip count={sessionCount} selected={isActive} />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : (
        <SessionCountContext.Provider value={sessionCountByDay}>
          <div className="max-w-full overflow-x-auto pb-1">
            <Calendar
              className="w-fit p-0 [--cell-size:2.75rem] [&_.rdp-day]:border [&_.rdp-day]:border-border [&_.rdp-month_grid]:border-collapse [&_.rdp-week]:mt-0 [&_.rdp-weekday]:border [&_.rdp-weekday]:border-b-0 [&_.rdp-weekday]:border-border"
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
