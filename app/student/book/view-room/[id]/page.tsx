"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Users } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import { getUserById, Room } from "@/app/utils/admin-firestore"
import { doc, getDoc } from "firebase/firestore"

export default function ViewDormitoryRoom() {
  const params = useParams()
  const router = useRouter()
  const roomId = params?.id ? params.id as string : ""
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [user] = useAuthState(auth)
  const [hasApprovedApplication, setHasApprovedApplication] = useState(false)
  
  // Get room directly from Firestore
  const getRoomById = async (id: string): Promise<Room | null> => {
    try {
      const roomRef = doc(db, 'rooms', id);
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const data = roomSnap.data();
        return { 
          id: roomSnap.id,
          name: data.name || '',
          dormId: data.dormId || '',
          dormName: data.dormName || '',
          capacity: data.capacity || 0,
          status: data.status || 'available',
          rfidEnabled: data.rfidEnabled || false,
          availableRooms: data.availableRooms || 0,
          currentOccupants: data.currentOccupants || 0,
          occupantIds: data.occupantIds || [],
          floor: data.floor || '',
          roomType: data.roomType || ''
        } as Room;
      }
      return null;
    } catch (error) {
      console.error(`Error getting room with ID ${id}:`, error);
      return null;
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const roomData = await getRoomById(roomId)
        setRoom(roomData)
        
        // Check if user has an approved application
        if (user) {
          try {
            const userData = await getUserById(user.uid)
            if (userData && userData.roomApplicationStatus === 'approved' && userData.roomApplicationId) {
              setHasApprovedApplication(true)
            }
          } catch (error) {
            console.error("Error fetching user data:", error)
            // Continue without setting hasApprovedApplication to true
          }
        }
      } catch (error) {
        console.error("Error fetching dormitory room:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [roomId, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading dormitory details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-semibold text-destructive">Dormitory room not found</h2>
            <p className="mt-2 text-gray-600">The dormitory room you're looking for doesn't exist or has been removed.</p>
            <Button className="mt-4" asChild>
              <Link href="/student/book">Back to Dormitory List</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" asChild>
            <Link href="/student/book">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dormitory List
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-primary">Dormitory Room {room.name}</h1>
          <p className="text-gray-600 mt-2 flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{room.dormName}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-secondary/20">
              <CardContent className="p-6">
                <img
                  src="/placeholder.svg?height=300&width=400"
                  alt={`Dormitory Room ${room.name}`}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary" />
                      <span className="font-medium">Occupancy: {room.capacity} {room.capacity > 1 ? "students" : "student"}</span>
                    </div>
                    <Badge className={room.status === "available" ? "bg-success text-white" : "bg-warning text-white"}>
                      {room.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-gray-600 mb-6">
                  A comfortable dormitory room perfect for students. Features standard dormitory furniture, good lighting, and all necessary amenities for a comfortable stay throughout the semester.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-secondary/20 sticky top-8">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Apply for Housing</CardTitle>
                <CardDescription>Submit your application for this dormitory room</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Room Number:</span>
                    <span className="font-medium">{room.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Building:</span>
                    <span className="font-medium">{room.dormName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Occupancy:</span>
                    <span className="font-medium">{room.capacity} {room.capacity > 1 ? "students" : "student"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={room.status === "available" ? "bg-success text-white" : "bg-warning text-white"}>
                      {room.status}
                    </Badge>
                  </div>
                </div>

                {room.status === "available" && !hasApprovedApplication ? (
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white" asChild>
                    <Link href={`/student/book/reserve/${room.id}`}>Apply Now</Link>
                  </Button>
                ) : (
                  <>
                    <Button disabled className="w-full">
                      {hasApprovedApplication ? "Already Applied" : "Currently Unavailable"}
                    </Button>
                    {hasApprovedApplication && (
                      <div className="text-xs text-amber-600 text-center mt-2">
                        You already have an approved room application and cannot apply for additional rooms.
                      </div>
                    )}
                  </>
                )}

                <div className="text-xs text-gray-500 text-center">
                  Dormitory applications are subject to approval by the housing administrator
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
