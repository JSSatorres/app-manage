"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppNavigation } from "@/components/shared/AppLink";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const { replace } = useAppNavigation();

  useEffect(() => {
    if (loading) return;
    if (!session) replace("/login");
  }, [loading, session, replace]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}

