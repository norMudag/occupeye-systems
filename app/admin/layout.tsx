"use client"

import { AdminSidebar } from "@/components/admin-sidebar"
import { useAuth } from "@/lib/AuthContext"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser, userData, loading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user is logged in and has admin role
    if (!loading) {
      if (!currentUser) {
        redirect('/')
      } else if (userData && userData.role === 'admin') {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
        redirect('/')
      }
    }
  }, [currentUser, userData, loading])

  // Show nothing while checking authorization, grabe naman po ikaw
  if (loading || isAuthorized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen text-sm">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  )
} 