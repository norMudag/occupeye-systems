"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Users, AlertCircle, Search, Settings, User, Eye } from "lucide-react"
import Navigation from "@/components/navigation"
import { 
  getRoomsByManagerDorm,
  Room,
} from "@/app/utils/manager-firestore"
import { 
  getUsersByIds
} from "@/app/utils/admin-firestore"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import TenantProfileModal from "@/app/components/tenant-profile-modal"

// User information interface
interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string | null | undefined;
  status: string;
}

export default function ManagerMyDorm() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [detailedRooms, setDetailedRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [roomOccupants, setRoomOccupants] = useState<UserInfo[]>([])
  const [isLoadingOccupants, setIsLoadingOccupants] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [dormName, setDormName] = useState<string>("My Dormitory")
  const [overallStats, setOverallStats] = useState({
    totalRooms: 0,
    totalOccupied: 0,
    totalAvailable: 0,
    overallOccupancy: 0
  })
  
  // Tenant profile state
  const [tenantProfileOpen, setTenantProfileOpen] = useState(false)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  // Function to calculate current academic year and semester
  const getCurrentAcademicPeriod = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-based
    
    // Determine academic year (assume it starts in August)
    let academicYear
    if (currentMonth >= 8) { // August onwards
      academicYear = `${currentYear}-${(currentYear + 1).toString().slice(2)}`
    } else {
      academicYear = `${currentYear - 1}-${currentYear.toString().slice(2)}`
    }
    
    // Determine semester
    let semester
    if (currentMonth >= 8 && currentMonth <= 12) { // August to December
      semester = "1st"
    } else if (currentMonth >= 1 && currentMonth <= 5) { // January to May
      semester = "2nd"
    } else { // June to July
      semester = "Summer"
    }
    
    return `${semester} '${academicYear}`
  }
  
  // Get current academic period
  const currentAcademicPeriod = getCurrentAcademicPeriod()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get rooms for manager's dormitory with optional status filter
        const roomsData = await getRoomsByManagerDorm(statusFilter !== "all" ? statusFilter : undefined)
        setDetailedRooms(roomsData)
        
        // Get dorm name from the first room (all rooms should have the same dormName)
        if (roomsData.length > 0 && roomsData[0].dormName) {
          setDormName(roomsData[0].dormName)
        }
        
        // Calculate overall stats
        const totalRooms = roomsData.length
        
        // Count rooms as occupied if they have at least one occupant
        const totalOccupied = roomsData.filter(room => room.currentOccupants > 0).length
        
        // A room is available if it has no occupants and is not in maintenance
        const totalAvailable = roomsData.filter(room => room.currentOccupants === 0 && room.status !== "maintenance").length
        
        // Calculate occupancy based on total residents vs total capacity
        const totalOccupants = roomsData.reduce((sum, room) => sum + room.currentOccupants, 0)
        const totalCapacity = roomsData.reduce((sum, room) => sum + room.capacity, 0)
        const overallOccupancy = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0
        
        setOverallStats({
          totalRooms,
          totalOccupied,
          totalAvailable,
          overallOccupancy
        })
      } catch (error) {
        console.error("Error fetching rooms data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [statusFilter])

  const filteredRooms = detailedRooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.building.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Open room management modal
  const openRoomModal = async (room: Room) => {
    setSelectedRoom(room);
    setRoomModalOpen(true);
    setIsLoadingOccupants(true);
    
    try {
      // Get occupant information from occupantIds
      if (room.occupantIds && room.occupantIds.length > 0) {
        const occupantUsers = await getUsersByIds(room.occupantIds);
        
        // Format user info for display - only include users with approved roomApplicationStatus
        const formattedOccupants: UserInfo[] = occupantUsers
          .filter(user => user.roomApplicationStatus === 'approved')
          .map(user => ({
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            studentId: user.studentId,
            status: user.status || 'exit' // Include the user's entry/exit status
          }));
        
        setRoomOccupants(formattedOccupants);
        
        // Update selected room with accurate occupant count if needed
        if (formattedOccupants.length !== room.currentOccupants) {
          setSelectedRoom({
            ...room,
            currentOccupants: formattedOccupants.length
          });
        }
      } else {
        setRoomOccupants([]);
      }
    } catch (error) {
      console.error("Error fetching room data:", error);
      setRoomOccupants([]);
    } finally {
      setIsLoadingOccupants(false);
    }
  }
  
  // Close room management modal
  const closeRoomModal = () => {
    setRoomModalOpen(false)
    setSelectedRoom(null)
  }
  
  // Open tenant profile modal
  const openTenantProfile = (tenantId: string) => {
    setSelectedTenantId(tenantId)
    setTenantProfileOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">{dormName} Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor residential capacity and occupancy in your assigned dormitory
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total Rooms</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalRooms}</div>
              <p className="text-xs text-muted-foreground">In your dormitory</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Currently Occupied</CardTitle>
              <Users className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{overallStats.totalOccupied}</div>
              <p className="text-xs text-muted-foreground">{overallStats.overallOccupancy}% occupancy rate</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Available Now</CardTitle>
              <Users className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{overallStats.totalAvailable}</div>
              <p className="text-xs text-muted-foreground">Available for housing</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Current Semester</CardTitle>
              <AlertCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentAcademicPeriod}</div>
              <p className="text-xs text-muted-foreground">Academic period</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Detailed Room Status</CardTitle>
            <CardDescription>Current resident assignments by room</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search room..."
                  className="pl-10 border-secondary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 border-secondary/20">
                  <SelectValue>{statusFilter === "all" ? "All Status" : statusFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading room data...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No rooms match your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <div key={room.id} className="p-6 border border-secondary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{room.name}</h3>
                        <p className="text-sm text-gray-600">
                          {room.building || room.dormName || ""}
                        </p>
                      </div>
                      <Badge
                        className={
                          room.status === "maintenance"
                            ? "bg-destructive text-white"
                            : room.currentOccupants >= room.capacity
                            ? "bg-warning text-white"
                              : room.currentOccupants > 0
                                ? "bg-primary text-white"
                              : "bg-success text-white"
                        }
                      >
                        {room.status === "maintenance"
                            ? "Maintenance"
                          : room.currentOccupants >= room.capacity
                            ? "Full"
                            : room.currentOccupants > 0
                              ? "Partially Occupied"
                            : "Available"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-gray-600">Capacity</div>
                        <div className="text-lg font-semibold">{room.capacity} residents</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Current Residents</div>
                        <div className={`text-lg font-semibold ${
                          room.currentOccupants >= room.capacity ? "text-warning" : 
                          room.currentOccupants > 0 ? "text-primary" : ""
                        }`}>
                          {room.currentOccupants} / {room.capacity}
                          {room.currentOccupants >= room.capacity && " (Full)"}
                          {room.currentOccupants > 0 && room.currentOccupants < room.capacity && " (Partial)"}
                          {room.currentOccupants === 0 && " (Empty)"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Occupancy</span>
                        <span>{Math.round((room.currentOccupants / room.capacity) * 100) || 0}%</span>
                      </div>
                      <Progress
                        value={(room.currentOccupants / room.capacity) * 100 || 0}
                        className={`h-2 ${
                          (room.currentOccupants / room.capacity) > 0.8
                            ? "bg-muted [&>div]:bg-warning"
                            : (room.currentOccupants / room.capacity) > 0.5
                              ? "bg-muted [&>div]:bg-primary"
                              : "bg-muted [&>div]:bg-success"
                        }`}
                      />
                    </div>

                    <div className="flex justify-end mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-secondary/20 text-primary hover:bg-secondary/10"
                        onClick={() => openRoomModal(room)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Room Management Modal */}
      <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Room Management</DialogTitle>
            <DialogDescription>
              Manage room details and occupants
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoom && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">{selectedRoom.name}</h3>
                <Badge
                  className={
                    selectedRoom.status === "maintenance"
                      ? "bg-destructive text-white"
                      : selectedRoom.currentOccupants >= selectedRoom.capacity
                      ? "bg-warning text-white"
                        : selectedRoom.currentOccupants > 0
                          ? "bg-primary text-white"
                        : "bg-success text-white"
                  }
                >
                  {selectedRoom.status === "maintenance"
                      ? "Maintenance"
                    : selectedRoom.currentOccupants >= selectedRoom.capacity
                      ? "Full"
                      : selectedRoom.currentOccupants > 0
                        ? "Partially Occupied"
                      : "Available"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Room ID</div>
                  <div className="text-xs font-medium text-gray-500">{selectedRoom.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Building</div>
                  <div className="text-lg font-semibold">{selectedRoom.building || selectedRoom.dormName || ""}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Capacity</div>
                  <div className="text-lg font-semibold">{selectedRoom.capacity} residents</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Current Residents</div>
                  <div className={`text-lg font-semibold ${
                    selectedRoom.currentOccupants >= selectedRoom.capacity ? "text-warning" : 
                    selectedRoom.currentOccupants > 0 ? "text-primary" : ""
                  }`}>
                    {selectedRoom.currentOccupants} / {selectedRoom.capacity}
                    {selectedRoom.currentOccupants >= selectedRoom.capacity && " (Full)"}
                    {selectedRoom.currentOccupants > 0 && selectedRoom.currentOccupants < selectedRoom.capacity && " (Partial)"}
                    {selectedRoom.currentOccupants === 0 && " (Empty)"}
                  </div>
                </div>
              </div>
              
              {/* Room Occupants */}
              <div className="mt-6 border-t border-secondary/20 pt-4">
                <h3 className="font-medium mb-3 flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Current Occupants
                </h3>
                
                {isLoadingOccupants ? (
                  <div className="text-center py-4">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading occupants...</p>
                  </div>
                ) : roomOccupants.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No current occupants in this room</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {roomOccupants.map((occupant) => (
                      <div key={occupant.id} className="flex items-center justify-between py-2 border-b border-secondary/10">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-primary mr-2" />
                          <div>
                            <p className="text-sm font-medium">{occupant.firstName} {occupant.lastName}</p>
                            <p className="text-xs text-gray-500">{occupant.studentId || occupant.id.substring(0, 8)}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                        <Badge className={
                          occupant.status === "entry"
                            ? "bg-success text-white text-xs"
                            : occupant.status === "exit"
                            ? "bg-warning text-white text-xs"
                            : "bg-primary text-white text-xs"
                        }>
                          {occupant.status || "Unknown"}
                        </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-primary"
                            onClick={() => openTenantProfile(occupant.id)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              className="border-secondary/20"
              onClick={closeRoomModal}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tenant Profile Modal */}
      <TenantProfileModal 
        open={tenantProfileOpen}
        onOpenChange={setTenantProfileOpen}
        userId={selectedTenantId}
      />
    </div>
  )
} 