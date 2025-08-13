"use client"

import { AuthProvider } from "@/lib/AuthContext"
import { RfidServiceProvider } from "@/lib/RfidService"
import { NotificationProvider } from "@/lib/NotificationContext"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RfidServiceProvider>
          <Toaster position="top-right" />
          {children}
        </RfidServiceProvider>
      </NotificationProvider>
    </AuthProvider>
  )
} 