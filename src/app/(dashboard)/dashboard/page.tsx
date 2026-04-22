"use client"

import { useWorkspaceContext } from "@/lib/workspaceContext"
import { useSedes } from "@/hooks/useSedes"
import { useEquipos } from "@/hooks/useEquipos"
import { useSesiones } from "@/hooks/useSesiones"
import { useUsuarios } from "@/hooks/useUsuarios"
import { useEjercicios } from "@/hooks/useEjercicios"
import {
  Building2,
  Shield,
  CalendarDays,
  Users,
  Dumbbell,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border/60 p-5 flex items-center gap-4 shadow-sm">
      <div
        className={cn(
          "size-12 rounded-xl flex items-center justify-center shrink-0",
          color,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </p>
        <p className="text-2xl font-bold text-foreground leading-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

interface SessionRowProps {
  fecha: string
  equipo: string
  estado: string
  objetivo: string | null
}

function SessionRow({ fecha, equipo, estado, objetivo }: SessionRowProps) {
  const estadoConfig: Record<string, { label: string; className: string }> = {
    Realizada: { label: "Realizada", className: "bg-green-100 text-green-700" },
    Planificada: {
      label: "Planificada",
      className: "bg-blue-100 text-blue-700",
    },
    Borrador: { label: "Borrador", className: "bg-amber-100 text-amber-700" },
  }
  const config = estadoConfig[estado] ?? {
    label: estado,
    className: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays size={16} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {equipo}
          </p>
          <p className="text-xs text-muted-foreground">
            {fecha} · {objetivo ?? "Sin objetivo"}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "text-xs font-semibold px-2.5 py-1 rounded-full shrink-0",
          config.className,
        )}
      >
        {config.label}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { activeWorkspaceId, sedeIds } = useWorkspaceContext()
  const { data: sedes } = useSedes(activeWorkspaceId)
  const { data: equipos } = useEquipos(activeWorkspaceId)
  const { data: sesiones } = useSesiones(sedeIds)
  const { data: usuarios } = useUsuarios()
  const { data: ejercicios } = useEjercicios(activeWorkspaceId)

  const totalSedes = sedes?.length ?? 0
  const totalEquipos = equipos?.length ?? 0
  const totalSesiones = sesiones?.length ?? 0
  const totalUsuarios = usuarios?.length ?? 0
  const totalEjercicios = ejercicios?.length ?? 0

  const sesionesRealizadas =
    sesiones?.filter((s) => s.estado === "Realizada").length ?? 0
  const sesionesPlanificadas =
    sesiones?.filter((s) => s.estado === "Planificada").length ?? 0
  const sesionesBorrador =
    sesiones?.filter((s) => s.estado === "Borrador").length ?? 0

  const recentSesiones = (sesiones ?? [])
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Panel de rendimiento
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Resumen general del club deportivo
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          title="Equipos activos"
          value={totalEquipos}
          subtitle={`${totalSedes} sedes`}
          icon={<Shield size={22} className="text-white" />}
          color="bg-primary"
        />
        <StatCard
          title="Total usuarios"
          value={totalUsuarios}
          subtitle={`${usuarios?.filter((u) => u.rol === "Entrenador").length ?? 0} entrenadores`}
          icon={<Users size={22} className="text-white" />}
          color="bg-emerald-500"
        />
        <StatCard
          title="Sesiones recientes"
          value={totalSesiones}
          subtitle={`${sesionesRealizadas} realizadas`}
          icon={<CalendarDays size={22} className="text-white" />}
          color="bg-orange-500"
        />
        <StatCard
          title="Ejercicios"
          value={totalEjercicios}
          icon={<Dumbbell size={22} className="text-white" />}
          color="bg-violet-500"
        />
        <StatCard
          title="Sedes"
          value={totalSedes}
          icon={<Building2 size={22} className="text-white" />}
          color="bg-cyan-500"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sessions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border/60 shadow-sm">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Sesiones recientes
              </h2>
              <p className="text-xs text-muted-foreground">
                Seguimiento en tiempo real
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-lg">
                Últimos 7 días
              </span>
            </div>
          </div>
          <div className="px-5 pb-5">
            {recentSesiones.length > 0 ? (
              recentSesiones.map((s) => (
                <SessionRow
                  key={s.id}
                  fecha={s.fecha}
                  equipo={s.equipoId}
                  estado={s.estado}
                  objetivo={s.objetivoSesion}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sin sesiones recientes
              </p>
            )}
          </div>
        </div>

        {/* Alerts / Summary */}
        <div className="bg-white rounded-xl border border-border/60 shadow-sm">
          <div className="p-5 pb-3">
            <h2 className="text-base font-bold text-foreground">
              Resumen rápido
            </h2>
            <p className="text-xs text-muted-foreground">
              Estado actual del club
            </p>
          </div>
          <div className="px-5 pb-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
              <CheckCircle2
                size={18}
                className="text-green-600 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Sesiones realizadas
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  {sesionesRealizadas} sesiones completadas con éxito
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Clock size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Planificadas
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {sesionesPlanificadas} sesiones pendientes de realizar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <AlertTriangle
                size={18}
                className="text-amber-600 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Borradores
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {sesionesBorrador} sesiones en borrador por completar
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-50 border border-violet-100">
              <TrendingUp
                size={18}
                className="text-violet-600 mt-0.5 shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-violet-800">
                  Rendimiento
                </p>
                <p className="text-xs text-violet-600 mt-0.5">
                  {totalEjercicios} ejercicios disponibles en la biblioteca
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <FileText size={18} className="text-gray-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Documentación
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Documentos disponibles por sede
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
