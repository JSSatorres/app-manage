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
    
    if (!this.isDevelopment && level === 'error') {
      this.sendToErrorService(entry)
    }
  }
  
  private sendToErrorService(entry: LogEntry) {
    if (typeof window === 'undefined') {
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
