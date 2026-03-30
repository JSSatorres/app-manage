"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface AppLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function AppLink({ href, children, className }: AppLinkProps) {
  const router = useRouter();
  const handlePress = useCallback(() => router.push(href), [router, href]);

  return (
    <button type="button" onClick={handlePress} className={className}>
      {children}
    </button>
  );
}

export function useAppNavigation() {
  const router = useRouter();

  return {
    push: useCallback((href: string) => router.push(href), [router]),
    replace: useCallback((href: string) => router.replace(href), [router]),
    back: useCallback(() => router.back(), [router]),
  };
}
