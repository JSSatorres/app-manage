# Monitoreo de Aplicaciones

## Qué es el Monitoreo

El monitoreo permite:
- **Detectar errores** en producción antes de que los usuarios los reporten
- **Medir rendimiento** de la aplicación (Core Web Vitals)
- **Conocer el uso real** de la app (analytics)
- **Alertar** cuando algo falla
- **Debuggear** problemas rápidamente

---

## Tipos de Monitoreo

| Tipo | Qué hace | Herramientas |
|------|----------|--------------|
| **Error Tracking** | Captura y agrupa errores | Sentry, Bugsnag |
| **Performance** | Mide tiempos de carga | Vercel Analytics, SpeedCurve |
| **Uptime** | Verifica que la app está viva | UptimeRobot, Pingdom |
| **Logging** | Registra eventos | LogRocket, Datadog |
| **Analytics** | Comportamiento de usuarios | Plausible, Google Analytics |

---

## 1. Sentry - Error Tracking (RECOMENDADO)

### Qué hace Sentry
- Captura excepciones de JavaScript automáticamente
- Agrupa errores similares
- Muestra el contexto (usuario, navegador,请求ID)
- Rastrea tendencias de errores

### Instalación

```bash
npm install @sentry/nextjs
```

### Configuración

1. Crear cuenta en [sentry.io](https://sentry.io)
2. Crear un nuevo proyecto "Next.js"
3. Copiar el DSN

```bash
# En la raíz del proyecto
npx sentry-wizard@latest -i nextjs
```

Esto crea:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- Actualiza `next.config.ts`

### Configuración Manual

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Entorno
  environment: process.env.NODE_ENV,
  
  // Muestreo en producción (captura menos para reducir costo)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Replay de sesiones (ve lo que hizo el usuario)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Ignorar errores ciertos
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ],
  
  // Antes de enviar un error
  beforeSend(event) {
    // Filtrar errores de bots
    if (event.request?.headers?.['User-Agent']?.includes('bot')) {
      return null
    }
    return event
  },
})
```

### Configuración en Next.js

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs'

const sentryWebpackPluginOptions = {
  silent: true,
}

export default withSentryConfig(
  {
    // tu config existente
    turbopack: {},
  },
  sentryWebpackPluginOptions
)
```

### Variables de Entorno

```env
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Uso en Código

```typescript
// Capturar errores manualmente
import * as Sentry from '@sentry/nextjs'

try {
  await fetchUserData()
} catch (error) {
  Sentry.captureException(error, {
    extra: {
      userId: user.id,
      action: 'fetch_user_data',
    },
  })
  throw error
}

// Capturar mensajes
Sentry.captureMessage('Usuario intentó acción no permitida', 'warning')

// Agregar contexto
Sentry.setContext('user', {
  id: user.id,
  email: user.email,
  role: user.rol,
})

Sentry.setTag('page', 'dashboard')
```

### Uso en Componentes

```typescript
// components/ErrorBoundary.tsx
'use client'

import { Component, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-4 text-center">
          <h2>Algo salió mal</h2>
          <button onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

```typescript
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

## 2. Vercel Analytics - Performance

### Qué hace
- Core Web Vitals automáticas (LCP, FID, CLS)
- Analytics de páginas vistas
- Metrics de rendimiento
- Gratis en Vercel

### Instalación

```bash
npm install @vercel/analytics
```

### Configuración

```typescript
// src/lib/analytics.ts
import { analytics } from '@vercel/analytics'

export const track = {
  page: (url: string) => {
    analytics.track('page_view', { url })
  },
  
  event: (name: string, properties?: Record<string, unknown>) => {
    analytics.track(name, properties)
  },
}
```

```typescript
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### Trackear Eventos

```typescript
// En cualquier componente
import { track } from '@/lib/analytics'

// Cuando el usuario crea un equipo
track.event('equipo_creado', {
  sede_id: sedeId,
  categoria: categoria,
})

// Cuando el usuario completa una sesión
track.event('sesion_completada', {
  equipo_id: equipoId,
  duracion_real: duracion,
})
```

---

## 3. Logging Estructurado

### Por qué logging estructurado

```typescript
// ❌ Logging tradicional - difícil de buscar
console.log('User created')
console.log('Error fetching data')

// ✅ Logging estructurado - fácil de filtrar y analizar
console.log(JSON.stringify({
  level: 'info',
  message: 'User created',
  userId: '123',
  timestamp: new Date().toISOString(),
}))

// ✅ Mejor aún: usar una librería
import { logger } from '@/lib/logger'
logger.info('User created', { userId: '123' })
```

### Implementación Simple

```typescript
// src/lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }
    
    // En desarrollo, logging colorido
    if (this.isDevelopment) {
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m',
      }
      console.log(
        `${colors[level]}[${level.toUpperCase()}]${'\x1b[0m'} ${message}`,
        context ?? ''
      )
    }
    
    // En producción, enviar a servicio externo (Sentry, Datadog, etc.)
    if (!this.isDevelopment && level === 'error') {
      this.sendToErrorService(entry)
    }
  }
  
  private sendToErrorService(entry: LogEntry) {
    // Aquí integrarías con Sentry, Datadog, etc.
    if (typeof window === 'undefined') {
      // Solo en servidor
      console.log(JSON.stringify(entry))
    }
  }
  
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context)
  }
  
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context)
  }
  
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context)
  }
  
  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context)
  }
}

export const logger = new Logger()
```

### Uso

```typescript
import { logger } from '@/lib/logger'

// Logger en servicios
logger.info('Equipo creado', {
  equipoId: result.id,
  sedeId: data.sede_id,
  usuarioId: user.id,
})

// Logger en errores
logger.error('Error al crear sesión', {
  error: error.message,
  data: data,
  stack: error.stack,
})
```

---

## 4. Uptime Monitoring

### Qué es
Verifica que tu aplicación está disponible y te alerta si cae.

### Herramientas Gratuitas

| Herramienta | Limitación | Web |
|------------|------------|-----|
| UptimeRobot | 50 monitores gratis | uptimerobot.com |
| Pingdom | 1 monitor gratis | pingdom.com |
| Better Uptime | 3 monitores gratis | betterstack.co |

### Configuración UptimeRobot

1. Crear cuenta en uptimerobot.com
2. Añadir nuevo monitor:
   - **Tipo**: HTTPS
   - **Nombre**: Manage Sport App
   - **URL**: https://tu-dominio.vercel.app
   - **Intervalo**: 5 minutos
3. Configurar alertas (email, Slack, Discord)

---

## 5. Dashboard de Monitoreo

### Crear una página de Status

```typescript
// src/app/(dashboard)/status/page.tsx
import { Card } from '@/components/ui/card'

interface StatusData {
  uptime: number
  responseTime: number
  lastCheck: string
  services: {
    name: string
    status: 'operational' | 'degraded' | 'down'
    latency?: number
  }[]
}

async function getStatusData(): Promise<StatusData> {
  // Aquí obtendrías datos reales de tus servicios
  return {
    uptime: 99.9,
    responseTime: 245,
    lastCheck: new Date().toISOString(),
    services: [
      { name: 'API', status: 'operational', latency: 120 },
      { name: 'Base de Datos', status: 'operational', latency: 45 },
      { name: 'Autenticación', status: 'operational', latency: 80 },
    ],
  }
}

export default async function StatusPage() {
  const status = await getStatusData()
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Estado del Sistema</h1>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Uptime (30 días)</div>
          <div className="text-3xl font-bold">{status.uptime}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Tiempo de respuesta</div>
          <div className="text-3xl font-bold">{status.responseTime}ms</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Última verificación</div>
          <div className="text-lg font-mono">
            {new Date(status.lastCheck).toLocaleTimeString()}
          </div>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Servicios</h2>
      <div className="space-y-2">
        {status.services.map((service) => (
          <Card key={service.name} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  service.status === 'operational'
                    ? 'bg-green-500'
                    : service.status === 'degraded'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              />
              <span className="font-medium">{service.name}</span>
            </div>
            <div className="text-muted-foreground">
              {service.latency ? `${service.latency}ms` : '-'}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## Checklist de Monitoreo

### Essentials (Implementar primero)
- [x] Sentry para error tracking
- [x] Vercel Analytics (si usas Vercel)
- [ ] Uptime monitoring configurado

### Recomendado
- [ ] Logging estructurado en servicios
- [ ] Dashboard de status público
- [ ] Alertas en Slack/Discord

### Opcional (para apps grandes)
- [ ] Datadog o similar para APM completo
- [ ] LogRocket para session replay
- [ ] SpeedCurve para监测 de rendimiento

---

## Recursos

- [Sentry Docs](https://docs.sentry.io)
- [Vercel Analytics](https://vercel.com/docs/concepts/analytics)
- [UptimeRobot](https://uptimerobot.com)
- [Core Web Vitals](https://web.dev/vitals/)
