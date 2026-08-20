import { QueryClient, QueryClientProvider, useMutation as useRQMutation, useQuery } from "@tanstack/react-query"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useMutation } from "@/hooks/useMutation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { QueryProvider } from "@/providers/query-provider"
import {
  RequestLockProvider,
  useRequestLock,
  type RequestLockContextValue,
} from "@/providers/request-lock-provider"

type Deferred<T> = {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T) => void
}

const processingStatusLabel = "Procesando solicitud\u2026"

function createDeferred<T>(): Deferred<T> {
  let reject!: (reason?: unknown) => void
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, reject, resolve }
}

function LockConsumer({ onReady }: { onReady: (lock: RequestLockContextValue) => void }) {
  const lock = useRequestLock()

  useEffect(() => {
    onReady(lock)
  }, [lock, onReady])

  return <span data-testid="pending">{String(lock.pending)}</span>
}

function renderRequestLockProvider() {
  let lock: RequestLockContextValue | null = null
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RequestLockProvider>
        <LockConsumer onReady={(value) => { lock = value }} />
        <button type="button">Contenido de la aplicaciÃ³n</button>
      </RequestLockProvider>
    </QueryClientProvider>,
  )

  return {
    ...view,
    getLock() {
      if (!lock) {
        throw new Error("El contexto del bloqueo no se ha inicializado")
      }

      return lock
    },
  }
}

function renderRequestLockProviderWithChildren(children: React.ReactNode) {
  let lock: RequestLockContextValue | null = null
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RequestLockProvider>
        <LockConsumer onReady={(value) => { lock = value }} />
        {children}
      </RequestLockProvider>
    </QueryClientProvider>,
  )

  return {
    ...view,
    getLock() {
      if (!lock) {
        throw new Error("El contexto del bloqueo no se ha inicializado")
      }

      return lock
    },
  }
}

function BaseUiDialogConsumer({ onAction }: { onAction: () => void }) {
  return (
    <Dialog>
      <DialogTrigger>Abrir diálogo</DialogTrigger>
      <DialogContent>
        <DialogTitle>Diálogo de prueba</DialogTitle>
        <button type="button" onClick={onAction}>Acción del diálogo</button>
      </DialogContent>
    </Dialog>
  )
}

function getDirectBodyPortal(element: HTMLElement) {
  let portal = element

  while (portal.parentElement !== document.body) {
    if (!portal.parentElement) {
      throw new Error("El portal de Base UI debe estar montado directamente en document.body")
    }

    portal = portal.parentElement
  }

  return portal
}

function appendPortal(id: string, initiallyInert = false) {
  const portal = document.createElement("div")
  portal.dataset.testPortal = id
  if (initiallyInert) {
    portal.setAttribute("inert", "")
  }

  const button = document.createElement("button")
  button.type = "button"
  button.textContent = `AcciÃ³n ${id}`
  portal.append(button)
  document.body.append(portal)

  return portal
}

function getContent() {
  const content = screen.getByTestId("request-lock-content")
  if (!(content instanceof HTMLElement)) {
    throw new Error("El contenido del bloqueo debe ser un elemento HTML")
  }

  return content
}

function ReactQueryMutationConsumer({ operation }: { operation: Promise<string> }) {
  const mutation = useRQMutation({ mutationFn: () => operation })

  return (
    <button type="button" onClick={() => mutation.mutate()}>
      Ejecutar mutación React Query
    </button>
  )
}

function InvalidatingMutationConsumer({
  mutationOperation,
  queryFn,
}: {
  mutationOperation: Promise<{ data: string | null; error: unknown | null }>
  queryFn: () => Promise<string>
}) {
  const query = useQuery({
    queryKey: ["request-lock-invalidation"],
    queryFn,
  })
  const mutation = useMutation(
    async () => mutationOperation,
    { invalidateKeys: [["request-lock-invalidation"]] },
  )

  return (
    <>
      <button type="button" onClick={() => void mutation.mutate(undefined)}>
        Ejecutar mutación con invalidación
      </button>
      <output data-testid="invalidation-value">{query.data ?? "pendiente"}</output>
      <output data-testid="invalidation-fetching">{String(query.isFetching)}</output>
    </>
  )
}

afterEach(() => {
  document.querySelectorAll("[data-test-portal]").forEach((portal) => portal.remove())
})

describe("RequestLockProvider", () => {
  it.each(["resuelve", "rechaza"] as const)(
    "muestra el bloqueo de QueryProvider durante una mutación que %s sin usar run",
    async (outcome) => {
      const deferred = createDeferred<string>()

      render(
        <QueryProvider>
          <ReactQueryMutationConsumer operation={deferred.promise} />
        </QueryProvider>,
      )

      fireEvent.click(screen.getByRole("button", { name: "Ejecutar mutación React Query" }))

      await waitFor(() =>
        expect(screen.getByTestId("request-lock-overlay")).toBeInTheDocument(),
      )

      if (outcome === "resuelve") {
        await act(async () => {
          deferred.resolve("completada")
          await deferred.promise
        })
      } else {
        await act(async () => {
          deferred.reject(new Error("No se pudo guardar"))
          await deferred.promise.catch(() => undefined)
        })
      }

      await waitFor(() =>
        expect(screen.queryByTestId("request-lock-overlay")).not.toBeInTheDocument(),
      )
    },
  )

  it("mantiene el bloqueo hasta terminar la invalidación esperada por useMutation", async () => {
    const mutation = createDeferred<{ data: string | null; error: unknown | null }>()
    const invalidation = createDeferred<string>()
    let deferQuery = false

    render(
      <QueryProvider>
        <InvalidatingMutationConsumer
          mutationOperation={mutation.promise}
          queryFn={() => (deferQuery ? invalidation.promise : Promise.resolve("inicial"))}
        />
      </QueryProvider>,
    )

    await waitFor(() => expect(screen.getByTestId("invalidation-value")).toHaveTextContent("inicial"))

    fireEvent.click(screen.getByRole("button", { name: "Ejecutar mutación con invalidación" }))

    await waitFor(() =>
      expect(screen.getByTestId("request-lock-overlay")).toBeInTheDocument(),
    )

    deferQuery = true
    await act(async () => {
      mutation.resolve({ data: "guardada", error: null })
      await mutation.promise
    })

    await waitFor(() => expect(screen.getByTestId("invalidation-fetching")).toHaveTextContent("true"))
    expect(screen.getByTestId("request-lock-overlay")).toBeInTheDocument()

    await act(async () => {
      invalidation.resolve("actualizada")
      await invalidation.promise
    })

    await waitFor(() =>
      expect(screen.queryByTestId("request-lock-overlay")).not.toBeInTheDocument(),
    )
  })

  it("permanece oculto en reposo y muestra un estado accesible durante run", () => {
    renderRequestLockProvider()

    expect(screen.getByTestId("pending")).toHaveTextContent("false")
    expect(screen.queryByRole("status", { name: processingStatusLabel })).not.toBeInTheDocument()
    expect(getContent()).not.toHaveAttribute("inert")
    expect(getContent()).toHaveAttribute("aria-busy", "false")
  })

  it("mantiene el bloqueo hasta que la operaciÃ³n manual se resuelve y conserva su valor", async () => {
    const deferred = createDeferred<string>()
    const { getLock } = renderRequestLockProvider()
    let operation!: Promise<string>

    act(() => {
      operation = getLock().run(() => deferred.promise)
    })

    expect(screen.getByTestId("pending")).toHaveTextContent("true")
    expect(getContent()).toHaveAttribute("inert")
    expect(getContent()).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("status", { name: processingStatusLabel })).toHaveAttribute("aria-live", "polite")
    expect(screen.getByRole("status", { name: processingStatusLabel })).toHaveAttribute("aria-atomic", "true")

    await act(async () => {
      deferred.resolve("completada")
      await expect(operation).resolves.toBe("completada")
    })

    expect(screen.getByTestId("pending")).toHaveTextContent("false")
    expect(screen.queryByRole("status", { name: processingStatusLabel })).not.toBeInTheDocument()
    expect(getContent()).not.toHaveAttribute("inert")

    const portalAfterResolve = appendPortal("tras-resolver")
    await Promise.resolve()
    expect(portalAfterResolve).not.toHaveAttribute("inert")
  })

  it("desbloquea su wrapper al resolver run cuando se monta directamente en body", async () => {
    const deferred = createDeferred<string>()
    let lock: RequestLockContextValue | null = null
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    })
    const view = render(
      <QueryClientProvider client={queryClient}>
        <RequestLockProvider>
          <LockConsumer onReady={(value) => { lock = value }} />
        </RequestLockProvider>
      </QueryClientProvider>,
      { container: document.body },
    )
    let operation!: Promise<string>

    try {
      act(() => {
        if (!lock) {
          throw new Error("El contexto del bloqueo no se ha inicializado")
        }

        operation = lock.run(() => deferred.promise)
      })

      expect(getContent()).toHaveAttribute("aria-busy", "true")
      expect(getContent()).toHaveAttribute("inert")

      await act(async () => {
        deferred.resolve("completada")
        await expect(operation).resolves.toBe("completada")
      })

      expect(getContent()).toHaveAttribute("aria-busy", "false")
      expect(getContent()).not.toHaveAttribute("inert")
    } finally {
      view.unmount()
    }
  })

  it("propaga el rechazo y limpia el bloqueo", async () => {
    const portal = appendPortal("rechazo")
    const deferred = createDeferred<never>()
    const error = new Error("No se pudo guardar")
    const { getLock } = renderRequestLockProvider()
    let operation!: Promise<never>

    act(() => {
      operation = getLock().run(() => deferred.promise)
    })

    expect(portal).toHaveAttribute("inert")

    await act(async () => {
      deferred.reject(error)
      await expect(operation).rejects.toBe(error)
    })

    expect(screen.getByTestId("pending")).toHaveTextContent("false")
    expect(screen.queryByRole("status", { name: processingStatusLabel })).not.toBeInTheDocument()
    expect(portal).not.toHaveAttribute("inert")

    const portalAfterReject = appendPortal("tras-rechazar")
    await Promise.resolve()
    expect(portalAfterReject).not.toHaveAttribute("inert")
  })

  it("propaga un lanzamiento sÃ­ncrono sin dejar el bloqueo activo", async () => {
    const error = new Error("Error sÃ­ncrono")
    const { getLock } = renderRequestLockProvider()
    let operation!: Promise<never>

    act(() => {
      operation = getLock().run(() => {
        throw error
      })
    })

    await expect(operation).rejects.toBe(error)
    await waitFor(() => expect(screen.getByTestId("pending")).toHaveTextContent("false"))
    expect(screen.queryByRole("status", { name: processingStatusLabel })).not.toBeInTheDocument()
  })

  it("no desbloquea hasta que termina la Ãºltima operaciÃ³n concurrente", async () => {
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    const { getLock } = renderRequestLockProvider()
    let firstOperation!: Promise<string>
    let secondOperation!: Promise<string>

    act(() => {
      firstOperation = getLock().run(() => first.promise)
      secondOperation = getLock().run(() => second.promise)
    })

    await act(async () => {
      first.resolve("primera")
      await expect(firstOperation).resolves.toBe("primera")
    })

    expect(screen.getByTestId("pending")).toHaveTextContent("true")
    expect(screen.getByRole("status", { name: processingStatusLabel })).toBeInTheDocument()

    await act(async () => {
      second.resolve("segunda")
      await expect(secondOperation).resolves.toBe("segunda")
    })

    expect(screen.getByTestId("pending")).toHaveTextContent("false")
  })

  it("inertiza los portales existentes y los aÃ±adidos durante el bloqueo, sin inertizar el overlay", async () => {
    const beforePortal = appendPortal("antes")
    const previouslyInertPortal = appendPortal("previo", true)
    const deferred = createDeferred<string>()
    const { getLock } = renderRequestLockProvider()
    let operation!: Promise<string>

    act(() => {
      operation = getLock().run(() => deferred.promise)
    })

    const afterPortal = appendPortal("despuÃ©s")
    await waitFor(() => expect(afterPortal).toHaveAttribute("inert"))

    expect(beforePortal).toHaveAttribute("inert")
    expect(previouslyInertPortal).toHaveAttribute("inert")
    expect(screen.getByTestId("request-lock-overlay")).not.toHaveAttribute("inert")

    await act(async () => {
      deferred.resolve("listo")
      await operation
    })

    expect(beforePortal).not.toHaveAttribute("inert")
    expect(afterPortal).not.toHaveAttribute("inert")
    expect(previouslyInertPortal).toHaveAttribute("inert")
  })

  it("restaura los portales y desconecta la observaciÃ³n al desmontar durante una operaciÃ³n", async () => {
    const portal = appendPortal("desmontaje")
    const deferred = createDeferred<string>()
    const { getLock, unmount } = renderRequestLockProvider()
    let operation!: Promise<string>

    act(() => {
      operation = getLock().run(() => deferred.promise)
    })

    expect(portal).toHaveAttribute("inert")
    unmount()
    expect(portal).not.toHaveAttribute("inert")

    const portalAfterUnmount = appendPortal("posterior")
    await Promise.resolve()
    expect(portalAfterUnmount).not.toHaveAttribute("inert")

    await act(async () => {
      deferred.resolve("listo")
      await operation
    })
  })

  it("inertiza un portal real de Base UI y restaura exactamente su estado al terminar run", async () => {
    const deferred = createDeferred<string>()
    const onAction = vi.fn()
    const { getLock } = renderRequestLockProviderWithChildren(
      <BaseUiDialogConsumer onAction={onAction} />,
    )
    let operation!: Promise<string>

    fireEvent.click(screen.getByRole("button", { name: "Abrir diálogo" }))

    const actionButton = screen.getByRole("button", { name: "Acción del diálogo" })
    const portal = getDirectBodyPortal(actionButton)
    expect(portal.parentElement).toBe(document.body)
    expect(portal).not.toHaveAttribute("inert")

    act(() => {
      operation = getLock().run(() => deferred.promise)
    })

    expect(portal).toHaveAttribute("inert")
    expect(actionButton).toBeInTheDocument()

    await act(async () => {
      deferred.resolve("completada")
      await expect(operation).resolves.toBe("completada")
    })

    expect(portal).not.toHaveAttribute("inert")
    expect(onAction).not.toHaveBeenCalled()
  })
})
