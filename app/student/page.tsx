"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/student/reservations")
  }, [router])

  return null
} 