"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import LoginModal from "@/components/ui/login-modal"
import Image from "next/image"

export default function Navbar() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  return (
    <>
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image
                src="/logo/Logo.png"
                alt="Logo"
                width={70}
                height={70}
                priority
              />
              <span className="text-xl font-bold text-primary">OccupEye</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                About
              </Button>
            
              <Button onClick={() => setIsLoginModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
                Login
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  )
}
