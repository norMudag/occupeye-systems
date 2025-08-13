"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Clock, MapPin, Eye, Plus } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { auth } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import { 
  getUserReservations, 
  getMonthlyReservationCount,
  getMonthlyHoursUsed, 
  Reservation
} from "@/app/utils/student-firestore"

export default function StudentReservations() {
  const [user] = useAuthState(auth)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [monthlyHours, setMonthlyHours] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservations = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch user reservations
        const reservationsData = await getUserReservations(user.uid);
        setReservations(reservationsData);
        
        // Get monthly stats
        const count = await getMonthlyReservationCount(user.uid);
        setMonthlyCount(count);
        
        const hours = await getMonthlyHoursUsed(user.uid);
        setMonthlyHours(hours);
      } catch (error) {
        console.error("Error fetching reservations data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReservations();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success text-white"
      case "pending":
        return "bg-secondary text-black"
      case "denied":
        return "bg-destructive text-white"
      case "cancelled":
        return "bg-warning text-white"
      default:
        return "bg-secondary text-black"
    }
  }

  const upcomingReservations = reservations.filter((r) => r.status === "approved" || r.status === "pending")
  const pastReservations = reservations.filter((r) => r.status === "denied" || r.status === "cancelled")

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">My Dormitory Applications</h1>
          <p className="text-gray-600 mt-2">Manage your dormitory reservations and application history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Active Applications</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingReservations.length}</div>
              <p className="text-xs text-muted-foreground">Pending or approved</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">This Semester</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyCount}</div>
              <p className="text-xs text-muted-foreground">Total applications</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Application Status</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingReservations.filter(r => r.status === "approved").length}</div>
              <p className="text-xs text-muted-foreground">Approved applications</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted border border-secondary/20">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Active ({upcomingReservations.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                History ({pastReservations.length})
              </TabsTrigger>
            </TabsList>
            <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
              <Link href="/student/book">
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Link>
            </Button>
          </div>

          <TabsContent value="upcoming" className="space-y-6">
            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Active Applications</CardTitle>
                <CardDescription>Your pending and approved dormitory applications</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">Loading dormitory application data...</div>
                ) : upcomingReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-primary mb-2">No active applications</h3>
                    <p className="text-gray-600 mb-4">You don't have any pending or approved dormitory applications.</p>
                    <Button className="bg-primary hover:bg-primary/90 text-white" asChild>
                      <Link href="/student/book">Apply for Dormitory</Link>
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-secondary/20">
                        <TableHead>Room</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingReservations.map((reservation) => (
                        <TableRow key={reservation.id} className="border-secondary/20">
                          <TableCell>
                            <div>
                              <div className="font-medium">Room {reservation.roomName}</div>
                              <div className="text-sm text-gray-600 flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {reservation.building}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{reservation.semester}</div>
                          </TableCell>
                          <TableCell>{reservation.purpose}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.status)}>{reservation.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-secondary/20 text-primary hover:bg-secondary/10"
                                asChild
                              >
                                <Link href={`/student/reservations/view/${reservation.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Application History</CardTitle>
                <CardDescription>Your past dormitory applications and their outcomes</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8">Loading application history...</div>
                ) : pastReservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-primary mb-2">No past applications</h3>
                    <p className="text-gray-600">Your dormitory application history will appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-secondary/20">
                        <TableHead>Room</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastReservations.map((reservation) => (
                        <TableRow key={reservation.id} className="border-secondary/20">
                          <TableCell>
                            <div>
                              <div className="font-medium">Room {reservation.roomName}</div>
                              <div className="text-sm text-gray-600 flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {reservation.building}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{reservation.semester}</div>
                          </TableCell>
                          <TableCell>{reservation.purpose}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reservation.status)}>{reservation.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-secondary/20 text-primary hover:bg-secondary/10"
                                asChild
                              >
                                <Link href={`/student/reservations/view/${reservation.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
