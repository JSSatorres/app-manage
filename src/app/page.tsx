"use client";

import { useEffect } from "react";
import { useAppNavigation } from "@/components/shared/AppLink";

export default function HomePage() {
  const { replace } = useAppNavigation();
  useEffect(() => {
    replace("/dashboard");
  }, [replace]);
  return null;
}
