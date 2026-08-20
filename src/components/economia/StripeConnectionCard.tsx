"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useRequestLock } from "@/providers/request-lock-provider";

export type StripeConnection = {
  id: string;
  stripeAccountId: string;
  status: "pending" | "restricted" | "active" | "disabled";
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
};

type StripeConnectionCardProps = {
  workspaceId: string;
  initialConnection?: StripeConnection | null;
  onNavigate?: (url: string) => void;
};

const statusLabels: Record<StripeConnection["status"], string> = {
  pending: "Pendiente",
  restricted: "Restringida",
  active: "Activa",
  disabled: "Desactivada",
};

function getActionLabel(connection: StripeConnection | null): string {
  if (!connection) return "Iniciar onboarding";
  if (connection.status === "pending") return "Continuar onboarding";
  return "Actualizar datos";
}

function getConnection(value: unknown): StripeConnection | null {
  if (!value || typeof value !== "object" || !("connection" in value)) return null;
  const connection = value.connection;
  if (!connection || typeof connection !== "object") return null;
  const candidate = connection as Partial<StripeConnection>;
  return typeof candidate.id === "string"
    && typeof candidate.stripeAccountId === "string"
    && (candidate.status === "pending" || candidate.status === "restricted" || candidate.status === "active" || candidate.status === "disabled")
    && typeof candidate.detailsSubmitted === "boolean"
    && typeof candidate.chargesEnabled === "boolean"
    && typeof candidate.payoutsEnabled === "boolean"
    ? candidate as StripeConnection
    : null;
}

function getUrl(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("url" in value)) return null;
  return typeof value.url === "string" ? value.url : null;
}

export function StripeConnectionCard({ workspaceId, initialConnection = null, onNavigate }: StripeConnectionCardProps) {
  const { session } = useAuth();
  const { pending, run } = useRequestLock();
  const inFlightRef = useRef(false);
  const [connection, setConnection] = useState<StripeConnection | null>(initialConnection);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (initialConnection || !accessToken) return;

    let cancelled = false;
    async function refreshStatus() {
      try {
        const response = await fetch(`/api/stripe/connect/status?workspaceId=${encodeURIComponent(workspaceId)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return;
        const nextConnection = getConnection(await response.json());
        if (!cancelled) setConnection(nextConnection);
      } catch {
        // El onboarding sigue disponible aunque no se pueda refrescar el estado.
      }
    }
    void refreshStatus();
    return () => {
      cancelled = true;
    };
  }, [initialConnection, session?.access_token, workspaceId]);

  async function requestConnection(path: string): Promise<unknown> {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ workspaceId }),
    });
    const data: unknown = await response.json();
    if (!response.ok) throw new Error("No se ha podido conectar Stripe.");
    return data;
  }

  async function handleOnboarding() {
    if (inFlightRef.current) return;
    if (!session?.access_token) {
      setErrorMessage("Tu sesión ha caducado. Vuelve a iniciar sesión para conectar Stripe.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      await run(async () => {
        let activeConnection = connection;
        if (!activeConnection) {
          activeConnection = getConnection(await requestConnection("/api/stripe/connect/account"));
          if (!activeConnection) throw new Error("No se ha podido crear la cuenta Stripe del club.");
          setConnection(activeConnection);
        }

        const url = getUrl(await requestConnection("/api/stripe/connect/account-link"));
        if (!url) throw new Error("No se ha podido crear el enlace de onboarding.");
        if (onNavigate) onNavigate(url);
        else window.location.assign(url);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se ha podido conectar Stripe.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>Cuenta Stripe del club</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p>Los cobros llegan a la cuenta Stripe del club</p>
        {connection ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={connection.status === "active" ? "default" : "secondary"}>
              {statusLabels[connection.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {connection.chargesEnabled && connection.payoutsEnabled
                ? "La cuenta puede cobrar y recibir pagos."
                : "Completa o revisa los datos requeridos por Stripe."}
            </span>
          </div>
        ) : <p className="text-sm text-muted-foreground">Configura una cuenta Stripe propia para este club.</p>}
        {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
      </CardContent>
      <CardFooter>
        <Button type="button" onClick={() => void handleOnboarding()} disabled={loading || pending}>
          {loading ? "Preparando onboarding…" : getActionLabel(connection)}
        </Button>
      </CardFooter>
    </Card>
  );
}
