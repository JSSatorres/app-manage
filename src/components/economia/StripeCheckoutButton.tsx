"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRequestLock } from "@/providers/request-lock-provider";

type StripeCheckoutButtonProps = {
  workspaceId: string;
  entryId: string;
  eligible: boolean;
  processing?: boolean;
  onNavigate?: (url: string) => void;
};

function getCheckoutUrl(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("url" in value)) return null;
  return typeof value.url === "string" ? value.url : null;
}

export function StripeCheckoutButton({
  workspaceId,
  entryId,
  eligible,
  processing = false,
  onNavigate,
}: StripeCheckoutButtonProps) {
  const { session } = useAuth();
  const { pending, run } = useRequestLock();
  const inFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function generateCheckoutUrl() {
    if (inFlightRef.current) return;
    if (!session?.access_token) {
      setErrorMessage("Tu sesión ha caducado. Vuelve a iniciar sesión para generar el enlace.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setErrorMessage(null);
    try {
      await run(async () => {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ workspaceId, entryId }),
        });
        const url = getCheckoutUrl(await response.json());
        if (!response.ok || !url) throw new Error("checkout");
        if (onNavigate) onNavigate(url);
        else window.open(url, "_blank", "noopener,noreferrer");
      });
    } catch {
      setErrorMessage("No se ha podido generar el enlace de pago.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  if (processing) return <p role="status" className="text-sm text-muted-foreground">Estamos confirmando el pago</p>;
  if (!eligible) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void generateCheckoutUrl()} disabled={loading || pending}>
        {loading ? "Generando enlace…" : "Generar enlace de pago"}
      </Button>
      {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
