"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useRequestLock } from "@/providers/request-lock-provider";

interface AppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AppLink({ href, children, className }: AppLinkProps) {
  const router = useRouter();
  const { pending } = useRequestLock();
  const handlePress = useCallback(() => {
    if (!pending) router.push(href);
  }, [pending, router, href]);

  return (
    <button type="button" onClick={handlePress} className={className} disabled={pending} aria-disabled={pending}>
      {children}
    </button>
  );
}

export function useAppNavigation() {
  const router = useRouter();
  const { pending } = useRequestLock();

  return {
    push: useCallback((href: string) => {
      if (!pending) router.push(href);
    }, [pending, router]),
    replace: useCallback((href: string) => {
      if (!pending) router.replace(href);
    }, [pending, router]),
    back: useCallback(() => {
      if (!pending) router.back();
    }, [pending, router]),
  };
}
