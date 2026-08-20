'use client'

import { useIsMutating } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type RequestLockContextValue = {
  pending: boolean
  run<T>(operation: () => Promise<T>): Promise<T>
}

const RequestLockContext = createContext<RequestLockContextValue | undefined>(undefined)

function RequestLockOverlay() {
  return createPortal(
    <div
      aria-atomic="true"
      aria-label={'Procesando solicitud\u2026'}
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80"
      data-request-lock-overlay
      data-testid="request-lock-overlay"
      role="status"
    >
      <div aria-hidden="true" className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>,
    document.body,
  )
}

export function RequestLockProvider({ children }: { children: React.ReactNode }) {
  const mutatingCount = useIsMutating()
  const [manualPendingCount, setManualPendingCount] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const pending = mutatingCount + manualPendingCount > 0

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setManualPendingCount((count) => count + 1)

    try {
      return await operation()
    } finally {
      setManualPendingCount((count) => Math.max(0, count - 1))
    }
  }, [])

  useEffect(() => {
    if (!pending) {
      return
    }

    const inertStateByElement = new Map<HTMLElement, boolean>()
    let restored = false

    const inertElement = (element: HTMLElement) => {
      if (element === contentRef.current || element.hasAttribute('data-request-lock-overlay')) {
        return
      }

      if (!inertStateByElement.has(element)) {
        inertStateByElement.set(element, element.hasAttribute('inert'))
      }

      element.setAttribute('inert', '')
    }

    Array.from(document.body.children).forEach((element) => {
      if (element instanceof HTMLElement) {
        inertElement(element)
      }
    })

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.parentElement === document.body) {
            inertElement(node)
          }
        })
      })
    })

    observer.observe(document.body, { childList: true })

    return () => {
      if (restored) {
        return
      }

      restored = true
      observer.disconnect()
      inertStateByElement.forEach((wasInert, element) => {
        if (wasInert) {
          element.setAttribute('inert', '')
          return
        }

        element.removeAttribute('inert')
      })
    }
  }, [pending])

  return (
    <RequestLockContext.Provider value={{ pending, run }}>
      <div ref={contentRef} aria-busy={pending} data-testid="request-lock-content" inert={pending}>
        {children}
      </div>
      {pending ? <RequestLockOverlay /> : null}
    </RequestLockContext.Provider>
  )
}

export function useRequestLock() {
  const context = useContext(RequestLockContext)

  if (!context) {
    throw new Error('useRequestLock debe usarse dentro de RequestLockProvider')
  }

  return context
}
