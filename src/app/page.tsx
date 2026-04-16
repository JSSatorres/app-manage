"use client"

import { useEffect } from "react"
import { useAppNavigation } from "@/components/shared/AppLink"
import { useAuth } from "@/hooks/useAuth"

export default function HomePage() {
  const { replace } = useAppNavigation()
  const { loading, session } = useAuth()

  useEffect(() => {
    if (loading) return
    replace(session ? "/dashboard" : "/login")
  }, [replace, loading, session])

  return null
}
