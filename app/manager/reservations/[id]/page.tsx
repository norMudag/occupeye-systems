"use client"

import type React from "react"
import { useState, useEffect } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Users, Calendar, FileText, ExternalLink, X, Download, Phone } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { getReservationById, type Reservation } from "@/app/utils/manager-firestore"

import { useToast } from "@/components/ui/use-toast"
import { doc, getDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface StudentInfo {
  name: string
  email: string
  initials: string
  profileImageUrl: string
  contactNumber: string
}

export default function ViewReservation() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [user] = useAuthState(auth)
  const reservationId = params.id as string
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCORModal, setShowCORModal] = useState(false)
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    name: "User",
    email: "user@university.edu",
    initials: "U",
    profileImageUrl: "",
    contactNumber: "091234567",
  })

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
            variant: "destructive",
          })
          router.push("/manager/approvals")
          return
        }

        setReservation(reservationData)

        // Fetch student info
        if (reservationData.userId) {
          const userDocRef = doc(db, "users", reservationData.userId)
          const userDoc = await getDoc(userDocRef)

          if (userDoc.exists()) {
            const data = userDoc.data()
            const firstName = (data.firstName as string) || ""
            const lastName = (data.lastName as string) || ""
            const email = (data.email as string) || ""
            const profileImageUrl = (data.profileImageUrl as string) || ""
            const contactNumber = (data.contactNumber as string) || ""

            setStudentInfo({
              name: `${firstName} ${lastName}`.trim() || "User",
              email,
              initials: `${firstName.charAt(0) || ""}${lastName.charAt(0) || ""}`.toUpperCase() || "U",
              profileImageUrl,
              contactNumber,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching reservation:", error)
        toast({
          title: "Error",
          description: "Failed to load reservation details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [reservationId, router, toast, user])

  const formatDate = (date: any) => {
    if (!date) return "N/A"
    if (date.toDate) return date.toDate().toLocaleString()
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="manager" />
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
        <Navigation userRole="manager" />
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
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" className="mb-4 bg-transparent" asChild>
            <Link href="/manager/approvals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reservations
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-primary">Dormitory Application</h1>
          <p className="text-gray-600 mt-2">Application ID: {reservation.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Dorm Info */}
          <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20 ">
                <CardTitle className="text-primary">Dormitory Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">Room {reservation.roomName}</h3>
                    <p className="text-gray-600 flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{reservation.building} Building</span>
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
                        <p className="text-gray-600">
                          {reservation.attendees} {reservation.attendees === 1 ? "person" : "people"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Status</p>
                        <Badge className="bg-secondary text-black">{reservation.status}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            
         
                    <CardHeader className="bg-muted/40 ">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Certificate of Registration (COR)
                    </CardTitle>
                      </CardHeader>
                    <CardContent>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 mt-2">
                        <div className="flex items-center justify-center mb-4">
                   <embed
                      src={`${reservation.corFile}`}
                      type="application/pdf"
                      className="w-full h-98 border rounded"
                     />
                  
                        </div>
                           <Button asChild className="flex items-center gap-2 text-white mt-5">
                          <a 
                            href={`${reservation.corFile}`}
                            download
                          >
                            <Download className="h-4 w-4" />
                            Download Document
                          </a>
                        </Button>
                        <div className="text-white text-center">
                          <h3 className="font-medium text-gray-900 mb-2">Certificate of Registration</h3>
                          <p className="text-sm text-gray-600 mb-4">
                            Official document verifying student enrollment and course registration
                          </p>                          
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        The Certificate of Registration is required for dormitory application verification and must be current for the academic year.
                      </p>
                    </CardContent>
            </Card>
            {/* Application Details */}

          </div>

          {/* Actions */}
          {isActive && (
            <div className="lg:col-span-1">
  
                <Card className="border-secondary/20 shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-secondary/20">
                    <CardTitle className="text-primary text-lg font-semibold">Application Details</CardTitle>
                  </CardHeader>

                  <CardContent className="border-gray-300 rounded-lg p-6 bg-gray-50">
                    {/* Left Side: Details */}
                    <div className="flex flex-col items-center justify-center">
                      <Avatar className="h-28 w-28 border-4 border-primary/60 shadow-md transition-transform duration-200 hover:scale-105">
                        <AvatarImage
                          src={studentInfo.profileImageUrl || "/placeholder-user.jpg"}
                          alt="User"
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                          {studentInfo.initials}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-3 text-sm text-gray-600 font-medium">{studentInfo.email}</p>
                      <Badge variant="outline" className="mt-2 px-3 py-1 text-xs bg-secondary/40">
                        {studentInfo.contactNumber || "No Contact Number"}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <Label className="text-sm text-muted-foreground">Student</Label>
                        <p className="text-lg font-medium text-gray-900 mt-1">{reservation.fullName}</p>
                      </div>

                      <div>
                        <Label className="text-sm text-muted-foreground">Reason for Application</Label>
                        <p className="text-gray-700 mt-1">{reservation.purpose}</p>
                      </div>

                      {reservation.notes && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Additional Notes</Label>
                          <p className="text-gray-700 mt-1 italic">{reservation.notes}</p>
                        </div>
                      )}

                      <div>
                        <Label className="text-sm text-muted-foreground">Applied On</Label>
                        <p className="text-gray-700 mt-1">{formatDate(reservation.createdAt)}</p>
                      </div>
                    </div>

                    {/* Right Side: Avatar */}
                    
                  </CardContent>
                </Card>

            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={`text-sm font-medium ${className}`}>{children}</span>
}
