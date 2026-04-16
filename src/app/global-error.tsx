'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Algo salió mal</h2>
            <p className="text-muted-foreground text-sm">
              Se ha producido un error inesperado. El equipo ha sido notificado.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
