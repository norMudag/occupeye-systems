"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Clock, Search, Eye, Building } from "lucide-react"
import Navigation from "@/components/navigation"
import { 
  getPendingReservations, 
  getPendingReservationsByDorm,
  updateReservationStatus,
  getSemesterReservationStats,
  Reservation,
  getAvailableRoomsByBuilding,
  Room,
  assignRoomToReservation
} from "@/app/utils/manager-firestore"
import { auth } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAdminUserIds, notifyAdminRoomAssignment } from "@/app/utils/notification-firestore"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import Link from "next/link"

export default function ManagerApprovals() {
  const [user] = useAuthState(auth)
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [hasDormAssigned, setHasDormAssigned] = useState(true)
  const [stats, setStats] = useState({
    pendingCount: 0,
    highPriorityCount: 0,
    approvedCount: 0,
    deniedCount: 0
  })

  // Room assignment dialog state
  const [roomAssignmentOpen, setRoomAssignmentOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [isAssigningRoom, setIsAssigningRoom] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)



  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        console.log("Fetching data for housing applications...")
        
        // Check if manager has assigned dormitory
        if (user) {
          const managerDoc = await getDoc(doc(db, 'users', user.uid));
          if (managerDoc.exists()) {
            const managerData = managerDoc.data();
            if (!managerData.managedDormId) {
              setHasDormAssigned(false);
              setIsLoading(false);
              return;
            }
          }
        }
        
        // Get pending reservations filtered by manager's assigned dormitory
        const pendingData = await getPendingReservationsByDorm()
        console.log("Received pending applications:", pendingData)
        setPendingReservations(pendingData)
        
        // Calculate stats
        const highPriority = pendingData.filter(r => r.priority === 'high').length
        
        // Get semester reservation stats
        const semesterStats = await getSemesterReservationStats()
        
        setStats({
          pendingCount: pendingData.length,
          highPriorityCount: highPriority,
          approvedCount: semesterStats.approvedCount,
          deniedCount: semesterStats.deniedCount
        })
      } catch (error) {
        console.error("Error fetching housing application data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [user])

  // Load available rooms when a building is selected
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!selectedReservation) return
      
      setLoadingRooms(true)
      try {
        const rooms = await getAvailableRoomsByBuilding(
          selectedReservation.building,
          selectedReservation.dormId
        )
        setAvailableRooms(rooms)
        
        // Auto-select first room if available
        if (rooms.length > 0) {
          setSelectedRoomId(rooms[0].id)
        }
      } catch (error) {
        console.error("Error fetching available rooms:", error)
      } finally {
        setLoadingRooms(false)
      }
    }
    
    if (selectedReservation) {
      fetchAvailableRooms()
    }
  }, [selectedReservation])

  const openRoomAssignmentDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setRoomAssignmentOpen(true)
  }

  const handleRoomAssignment = async () => {
    if (!user?.uid || !selectedReservation || !selectedRoomId) return
    
    setIsAssigningRoom(true)
    try {
      // Get manager details and check authorization
      const managerDoc = await getDoc(doc(db, 'users', user.uid));
      if (!managerDoc.exists()) {
        throw new Error("Manager document not found");
      }
      
      const managerData = managerDoc.data();
      const managedDormId = managerData.managedDormId;
      let managerName = managerData.firstName || "Manager";
      
      // Ensure manager is authorized to approve this reservation
      if (!managedDormId || managedDormId !== selectedReservation.dormId) {
        toast.error("You are not authorized to approve reservations for this dormitory");
        setRoomAssignmentOpen(false);
        return;
      }
      
      // Get the selected room details
      const selectedRoom = availableRooms.find(room => room.id === selectedRoomId);
      if (!selectedRoom) {
        throw new Error("Selected room not found");
      }
      
      // First assign the room to the reservation
      const assignSuccess = await assignRoomToReservation(
        selectedReservation.id,
        selectedRoomId
      )
      
      if (assignSuccess) {
        // Then approve the reservation
        const approveSuccess = await updateReservationStatus(
          selectedReservation.id,
          'approved',
          user.uid
        )
        
        if (approveSuccess) {
          // Notify all admin users about the room assignment
          try {
            const adminUserIds = await getAdminUserIds();
            
            for (const adminId of adminUserIds) {
              await notifyAdminRoomAssignment(adminId, {
                studentId: selectedReservation.studentId || '',
                studentName: selectedReservation.fullName || selectedReservation.student || 'Student',
                roomId: selectedRoomId,
                roomName: selectedRoom.name,
                building: selectedReservation.building || selectedRoom.building || 'Unknown Building',
                assignedBy: managerName
              });
            }
          } catch (notifyError) {
            console.error("Error notifying admins about room assignment:", notifyError);
            // Continue with the approval process even if notification fails
          }
          
        // Update the local state to remove the approved reservation
          setPendingReservations((prev) => prev.filter((r) => r.id !== selectedReservation.id))
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          highPriorityCount: Math.max(0, 
            prev.highPriorityCount - (
                selectedReservation.priority === 'high' ? 1 : 0
            )
          ),
          approvedCount: prev.approvedCount + 1
        }))
          
          // Close the dialog
          setRoomAssignmentOpen(false)
          setSelectedReservation(null)
          setSelectedRoomId("")
          
          toast.success(`Room ${selectedRoom.name} successfully assigned`);
        }
      }
    } catch (error) {
      console.error("Error assigning room and approving application:", error)
      toast.error("Failed to assign room. Please try again.");
    } finally {
      setIsAssigningRoom(false)
    }
  }

  const handleDenyReservation = async (id: string) => {
    try {
      if (!user?.uid) return
      
      // Get the reservation to check dormId
      const reservation = pendingReservations.find(r => r.id === id);
      if (!reservation) {
        console.error(`Reservation with ID ${id} not found in local state`);
        return;
      }
      
      // Get manager details and check authorization
      const managerDoc = await getDoc(doc(db, 'users', user.uid));
      if (!managerDoc.exists()) {
        throw new Error("Manager document not found");
      }
      
      const managerData = managerDoc.data();
      const managedDormId = managerData.managedDormId;
      
      // Ensure manager is authorized to deny this reservation
      if (!managedDormId || managedDormId !== reservation.dormId) {
        toast.error("You are not authorized to deny reservations for this dormitory");
        return;
      }
      
      console.log(`Denying housing application with ID: ${id}`)
      const success = await updateReservationStatus(id, 'denied', user.uid)
      
      if (success) {
        console.log(`Successfully denied housing application ${id}`)
        // Update the local state to remove the denied reservation
        setPendingReservations((prev) => prev.filter((r) => r.id !== id))
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          highPriorityCount: Math.max(0, 
            prev.highPriorityCount - (
              pendingReservations.find(r => r.id === id)?.priority === 'high' ? 1 : 0
            )
          ),
          deniedCount: prev.deniedCount + 1
        }))
        
        toast.success("Reservation denied successfully");
      }
    } catch (error) {
      console.error("Error denying housing application:", error)
      toast.error("Failed to deny reservation. Please try again.");
    }
  }

  const filteredReservations = pendingReservations.filter((reservation) => {
    
    // Handle potential undefined values safely
    const studentName = (reservation.student || '').toLowerCase();
    const studentId = (reservation.studentId || '').toLowerCase();
    const roomName = (reservation.room || '').toLowerCase();
    const searchTermLower = searchTerm.toLowerCase();
    
    const matchesSearch =
      studentName.includes(searchTermLower) ||
      studentId.includes(searchTermLower) ||
      roomName.includes(searchTermLower)
      
    const matchesPriority = 
      filterStatus === "all" || 
      (filterStatus === "high" && reservation.priority === "high") ||
      (filterStatus === "normal" && (reservation.priority === "normal" || !reservation.priority))
      
    return matchesSearch && matchesPriority
  })

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case "high":
        return "bg-warning text-white"
      case "normal":
      default:
        return "bg-secondary text-black"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Housing Applications</h1>
          <p className="text-gray-600 mt-2">Review and process student dormitory applications</p>
        </div>

        {!hasDormAssigned ? (
          <Card className="border-secondary/20">
            <CardHeader className="border-b border-secondary/20">
              <CardTitle className="text-primary">No Dormitory Assigned</CardTitle>
              <CardDescription>You need to be assigned to a dormitory to manage reservations</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No Dormitory Assignment</h3>
                <p className="text-gray-600 mb-4">You currently don't have any dormitory assigned to manage. Please contact an administrator to get assigned to a dormitory.</p>
                <Button variant="outline" onClick={() => window.location.href = "/manager/dashboard"}>
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">High Priority</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.highPriorityCount}</div>
              <p className="text-xs text-muted-foreground">Urgent applications</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Approved This Semester</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.approvedCount}</div>
              <p className="text-xs text-muted-foreground">Applications approved</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Denied This Semester</CardTitle>
              <XCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.deniedCount}</div>
              <p className="text-xs text-muted-foreground">Applications denied</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Pending Housing Applications</CardTitle>
                <CardDescription>You can only review and process applications for your assigned dormitory</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student name, ID, or dormitory room..."
                  className="pl-10 border-secondary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 border-secondary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="normal">Normal Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading housing applications...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">All caught up!</h3>
                <p className="text-gray-600">No pending housing applications to review at this time.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-secondary/20">
                    <TableHead>Student</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReservations.map((reservation) => (
                    
                    <TableRow key={reservation.id} className="border-secondary/20">
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.fullName || reservation.student}</div>
                          <div className="text-sm text-gray-600">{reservation.studentId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-primary" />
                          <span>{reservation.building}</span>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.semester}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={reservation.purpose}>
                          {reservation.purpose}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(reservation.priority)}>
                          {reservation.priority || "Normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => openRoomAssignmentDialog(reservation)}
                            className="bg-success hover:bg-success/90 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Assign Room
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDenyReservation(reservation.id)}
                            className="bg-warning hover:bg-warning/90 text-white"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-secondary/20 text-primary hover:bg-secondary/10"
                          >
                            <Link href={`/manager/reservations/${reservation.id}`}>
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
          </>
        )}
      </main>

      {/* Room Assignment Dialog */}
      <Dialog open={roomAssignmentOpen} onOpenChange={setRoomAssignmentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Room to Student</DialogTitle>
            <DialogDescription>
              Select a room to assign to {selectedReservation?.fullName || selectedReservation?.student} before approving their application.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Building</h4>
              <div className="flex items-center space-x-2 p-2 border rounded-md bg-secondary/10">
                <Building className="h-4 w-4 text-primary" />
                <span>{selectedReservation?.building}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Available Rooms</h4>
              {loadingRooms ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="text-center py-4 text-warning">
                  No available rooms in this building
                </div>
              ) : (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.name} - Capacity: {room.capacity}, Current: {room.currentOccupants || 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRoomAssignmentOpen(false)}
              disabled={isAssigningRoom}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRoomAssignment} 
              disabled={isAssigningRoom || loadingRooms || availableRooms.length === 0 || !selectedRoomId}
              className="bg-success hover:bg-success/90 text-white"
            >
              {isAssigningRoom ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Assign & Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
