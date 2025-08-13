"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, MapPin, Users, ArrowLeft, Building } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import { getRoomsByDormName, Room } from "@/app/utils/admin-firestore"
import { useRouter, useParams } from "next/navigation"

export default function ViewRooms() {
  const router = useRouter()
  const params = useParams()
  const [user] = useAuthState(auth)
  const [searchTerm, setSearchTerm] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const dormName = params?.building ? decodeURIComponent(params.building as string) : ""

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch rooms for this dorm by name
        const roomsData = await getRoomsByDormName(dormName);
        // Filter only available rooms
        const availableRooms = roomsData.filter(room => room.status === 'available');
        setRooms(availableRooms);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dormName]);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.id.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 pl-0 text-gray-600 hover:text-primary hover:bg-transparent"
            onClick={() => router.push("/student/book")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dormitories
          </Button>
          
          <div className="flex items-center mb-2">
            <Building className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-3xl font-bold text-primary">{dormName}</h1>
          </div>
          <p className="text-gray-600 mt-2">
            Browse available rooms in this dormitory building
          </p>
        </div>

        <Card className="border-secondary/20 mb-8">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Search Rooms</CardTitle>
            <CardDescription>Find available rooms in {dormName}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by room number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-secondary/20"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Available Rooms</CardTitle>
            <CardDescription>{filteredRooms.length} available room(s) found</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Loading rooms</h3>
                <p className="text-gray-500">Please wait while we fetch the room data...</p>
              </div>
            ) : filteredRooms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-secondary/20">
                    <TableHead>Room</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map((room) => (
                    <TableRow key={room.id} className="border-secondary/20">
                      <TableCell>
                        <div>
                          <div className="font-medium">Room {room.name}</div>
                          <div className="text-sm text-gray-600">ID: {room.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>{room.capacity} students</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={room.status === "available" ? "bg-success text-white" : "bg-warning text-white"}
                        >
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-secondary/20 text-primary hover:bg-secondary/10"
                            asChild
                          >
                            <Link href={`/student/book/view-room/${room.id}`}>View</Link>
                          </Button>
                          {room.status === "available" && (
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" asChild>
                              <Link href={`/student/book/reserve/${room.id}`}>Apply Now</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No rooms found</h3>
                <p className="text-gray-600 mb-4">Try changing your search criteria or check back later.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 