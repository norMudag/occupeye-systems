"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function HomePage() {
  const router = useRouter()
  const { currentUser } = useAuth()

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      // If user is not logged in, redirect to login page
      if (!currentUser) {
        router.push("/login")
        return
      }

      try {
      // Get user data from Firestore to determine role
        const userDoc = await getDoc(doc(db, "users", currentUser.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const userRole = userData.role || "student"
        
          // Redirect based on user role
        switch (userRole) {
          case "student":
              router.push("/student/reservations")
            break
          case "admin":
            router.push("/admin/dashboard")
            break
          case "manager":
            router.push("/manager/dashboard")
            break
          default:
              router.push("/student/reservations")
        }
      } else {
          // If no user data in Firestore, default to student view
          router.push("/student/reservations")
        }
      } catch (error) {
        console.error("Error checking user role:", error)
        router.push("/login")
      }
    }

    checkUserAndRedirect()
  }, [currentUser, router])

  // Return null or a loading indicator while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
