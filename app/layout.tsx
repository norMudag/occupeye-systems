import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OccupEye - Dormitory Space Tracking & Reservation System",
  description: "Modern web-based frontend for university housing division space tracking and reservation management",
  icons: [
    { rel: "icon", url: "/logo/logo-32.png", sizes: "32x32" },
    { rel: "icon", url: "/logo/logo.png", sizes: "64x64" },
    { rel: "icon", url: "/logo/logo-128.png", sizes: "128x128" },
    { rel: "icon", url: "/logo/logo-256.png", sizes: "256x256" },
    { rel: "icon", url: "/logo/logo-512.png", sizes: "512x512" },

    { rel: "apple-touch-icon", url: "/logo/logo-180.png", sizes: "180x180" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
