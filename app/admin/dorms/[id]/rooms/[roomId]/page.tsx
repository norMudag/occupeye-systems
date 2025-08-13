"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Building, Users, Wifi, CheckCircle, XCircle, User } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  getRoomById,
  getUsersByIds,
  Room,
  User as UserType
} from "@/app/utils/admin-firestore"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default function RoomDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dormId = params.id as string
  const roomId = params.roomId as string
  
  // State variables
  const [room, setRoom] = useState<Room | null>(null)
  const [occupants, setOccupants] = useState<UserType[]>([])
  const [loading, setLoading] = useState(true)
  const [occupancyRate, setOccupancyRate] = useState(0)
  
  // Fetch room data on component mount
  useEffect(() => {
    if (!roomId) return
    fetchRoomData()
  }, [roomId])

  // Fetch room details and occupant data
  const fetchRoomData = async () => {
    setLoading(true)
    try {
      // Get room details
      const roomData = await getRoomById(roomId)
      if (!roomData) {
        toast.error("Room not found")
        router.push(`/admin/dorms/${dormId}/rooms`)
        return
      }
      
      setRoom(roomData)
      
      // Calculate occupancy rate
      const rate = roomData.capacity > 0 
        ? Math.round((roomData.currentOccupants / roomData.capacity) * 100) 
        : 0
      setOccupancyRate(rate)
      
      // Get occupant details if available
      if (roomData.occupantIds && roomData.occupantIds.length > 0) {
        const occupantsData = await getUsersByIds(roomData.occupantIds)
        setOccupants(occupantsData)
      }
    } catch (error) {
      console.error("Error fetching room data:", error)
      toast.error("Failed to load room data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="ml-4 text-lg text-gray-600">Loading room details...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <XCircle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-destructive mb-2">Room not found</h2>
          <p className="text-gray-600 mb-6">The room you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link href={`/admin/dorms/${dormId}/rooms`}>Back to Rooms List</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4 pl-0 text-gray-600 hover:text-primary hover:bg-transparent"
          onClick={() => router.push(`/admin/dorms/${dormId}/rooms`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Rooms
        </Button>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center">
              <Building className="h-6 w-6 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-primary">
                Room {room.name}
              </h1>
            </div>
            <p className="text-gray-600 mt-1">
              {room.dormName} - Room Details and Occupancy
            </p>
          </div>
        </div>
      </div>
      
      {/* Room Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-1 border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Room Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Room ID</p>
                <p className="font-medium">{room.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Room Name</p>
                <p className="font-medium">{room.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Building</p>
                <p className="font-medium">{room.dormName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge className={
                  room.status === 'available' 
                    ? 'bg-success text-white' 
                    : room.status === 'occupied' 
                      ? 'bg-warning text-white' 
                      : 'bg-destructive text-white'
                }>
                  {room.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">RFID Access</p>
                <div className="flex items-center mt-1">
                  {room.rfidEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success mr-2" />
                      <span className="text-success">Enabled</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive mr-2" />
                      <span className="text-destructive">Disabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Occupancy Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 bg-secondary/10 rounded-lg text-center">
                <p className="text-sm text-gray-500">Total Capacity</p>
                <p className="text-2xl font-bold">{room.capacity}</p>
                <p className="text-xs text-gray-500 mt-1">Maximum occupants</p>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg text-center">
                <p className="text-sm text-gray-500">Current Occupants</p>
                <p className="text-2xl font-bold">{room.currentOccupants}</p>
                <p className="text-xs text-gray-500 mt-1">Students assigned</p>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg text-center">
                <p className="text-sm text-gray-500">Available Slots</p>
                <p className="text-2xl font-bold">{room.capacity - room.currentOccupants}</p>
                <p className="text-xs text-gray-500 mt-1">Remaining capacity</p>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Occupancy Rate</span>
                <span className="text-sm font-medium">{occupancyRate}%</span>
              </div>
              <Progress 
                value={occupancyRate} 
                className={`h-2 ${
                  occupancyRate > 80 ? "bg-destructive" : 
                  occupancyRate > 50 ? "bg-warning" : 
                  "bg-success"
                }`} 
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Occupants List */}
      <Card className="border-secondary/20">
        <CardHeader className="border-b border-secondary/20">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-primary">Room Occupants</CardTitle>
              <CardDescription>
                {occupants.length > 0 
                  ? `${occupants.length} student${occupants.length > 1 ? 's' : ''} assigned to this room` 
                  : 'No students currently assigned to this room'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {occupants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-secondary/20">
                  <TableHead>Student Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Academic Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occupants.map((student) => (
                  <TableRow key={student.id} className="border-secondary/20">
                    <TableCell className="font-medium">
                      {student.firstName} {student.lastName}
                    </TableCell>
                    <TableCell>{student.studentId || "-"}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-secondary/10">
                        {student.academicStatus || "Not specified"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/view/${student.id}`}>
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No occupants found</h3>
              <p className="text-gray-500 max-w-md">
                This room currently has no students assigned to it. Students will appear here when they are assigned to this room.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 