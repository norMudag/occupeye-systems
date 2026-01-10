"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Users, Calendar, FileText, User } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { getReservationById, updateReservationStatus, Reservation } from "@/app/utils/student-firestore"
import { useToast } from "@/components/ui/use-toast"

export default function ViewReservation() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [user] = useAuthState(auth)
  const reservationId = params.id as string
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservation = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const reservationData = await getReservationById(reservationId)
        if (!reservationData) {
          toast({
            title: "Error",
            description: "Reservation not found",
            variant: "destructive"
          })
          router.push("/student/reservations")
          return
        }
        
        // Check if this reservation belongs to the current user
        if (reservationData.userId !== user.uid) {
          toast({
            title: "Access Denied",
            description: "You do not have permission to view this reservation",
            variant: "destructive"
          })
          router.push("/student/reservations")
          return
        }
        
        setReservation(reservationData)
      } catch (error) {
        console.error("Error fetching reservation:", error)
        toast({
          title: "Error",
          description: "Failed to load reservation details",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchReservation()
  }, [reservationId, router, toast, user])

  const handleCancelReservation = async () => {
    if (!reservation) return
    
    try {
      const success = await updateReservationStatus(reservationId, "cancelled")
      if (success) {
        toast({
          title: "Reservation Cancelled",
          description: "Your dormitory reservation has been cancelled successfully"
        })
        
        // Update local state
        setReservation({
          ...reservation,
          status: "cancelled"
        })
      } else {
        throw new Error("Failed to cancel reservation")
      }
    } catch (error) {
      console.error("Error cancelling reservation:", error)
      toast({
        title: "Error",
        description: "Failed to cancel reservation",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success text-white"
      case "pending":
        return "bg-secondary text-black"
      case "cancelled":
        return "bg-warning text-white"
      case "denied":
        return "bg-destructive text-white"
      default:
        return "bg-secondary text-black"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dormitory reservation details...</p>
        </main>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Reservation not found</h2>
          <p className="mt-2 text-gray-600">The reservation you're trying to view doesn't exist or has been removed.</p>
          <Button className="mt-4" asChild>
            <Link href="/student/reservations">Back to Reservations</Link>
          </Button>
        </main>
      </div>
    )
  }

  
  const isActive = reservation.status === "pending"

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" asChild>
            <Link href="/student/reservations">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reservations
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-primary">Dormitory Application</h1>
          <p className="text-gray-600 mt-2">Application ID: {reservation.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Dormitory Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">Room {reservation.roomName}</h3>
                    <p className="text-gray-600 flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {reservation.building} Building
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Semester</p>
                        <p className="text-gray-600">{reservation.semester}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Occupants</p>
                        <p className="text-gray-600">{reservation.attendees} {reservation.attendees === 1 ? "person" : "people"}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Status</p>
                        <Badge className={getStatusColor(reservation.status)}>{reservation.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Application Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">Reason for Application</Label>
                    <p className="text-gray-600 mt-1">{reservation.purpose}</p>
                  </div>

                  {reservation.notes && (
                    <div>
                      <Label className="font-medium">Additional Notes</Label>
                      <p className="text-gray-600 mt-1">{reservation.notes}</p>
                    </div>
                  )}

                  <div>
                    <Label className="font-medium">Applied On</Label>
                    <p className="text-gray-600 mt-1">{new Date(reservation.createdAt).toLocaleDateString()}</p>
                  </div>

                  {reservation.status === "approved" && reservation.managerId && (
                    <div>
                      <Label className="font-medium">Approved By</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-gray-600">Housing Administrator</span>
                        {reservation.updatedAt && (
                          <span className="text-sm text-gray-500">on {new Date(reservation.updatedAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {isActive && (
            <div className="lg:col-span-1">
              <Card className="border-secondary/20 sticky top-8">
                <CardHeader className="border-b border-secondary/20">
                  <CardTitle className="text-primary">Actions</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full border-warning text-warning hover:bg-warning/10"
                    onClick={handleCancelReservation}
                  >
                    Cancel Application
                  </Button>
                  <div className="pt-4 border-t border-secondary/20">
                    <p className="text-xs text-gray-500">
                      Need help? Contact the housing administrator for assistance with your dormitory application.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>
}

