"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Search, Plus, Edit, Settings, RefreshCw, Wifi, Trash2 } from "lucide-react"
import { 
  getRooms, 
  Room,
  updateRoom,
  createRoom,
  deleteRoom
} from "@/app/utils/admin-firestore"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Room form type
interface RoomForm {
  name: string;
  building: string;
  capacity: number;
  status: string;
  rfidEnabled: boolean;
}

export default function RoomManagement() {
  // State variables
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [buildingFilter, setBuildingFilter] = useState('all')
  
  // Room creation modal state
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomForm, setRoomForm] = useState<RoomForm>({
    name: '',
    building: '',
    capacity: 1,
    status: 'available',
    rfidEnabled: false
  })
  const [roomError, setRoomError] = useState('')
  
  // Room edit modal state
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false)
  const [editRoomLoading, setEditRoomLoading] = useState(false)
  const [editRoomForm, setEditRoomForm] = useState<Room | null>(null)
  const [editRoomError, setEditRoomError] = useState('')

  // Room deletion state
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null)
  const [deleteRoomName, setDeleteRoomName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Available buildings/dormitories
  const availableBuildings = [
    "Princess Lawanen Hall - North Wings",
    "Princess Lawanen Hall - South Wings",
    "Rajah Indarapatra Hall - North Wings",
    "Rajah Indarapatra Hall - South Wings",
    "Raja Dumdoma Hall",
    "Raja Sulaiman Hall",
    "Super New Boys",
    "Super New Girls",
    "Bolawan Hall",
    "Turogan Hall"
  ];

  // Fetch data on component mount
  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async (building?: string) => {
    try {
      setLoading(true)
      const allRooms = await getRooms(building || buildingFilter !== 'all' ? buildingFilter : undefined)
      setRooms(allRooms)
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast.error("Failed to load rooms")
    } finally {
      setLoading(false)
    }
  }

  // Handle filtering rooms by building
  const handleBuildingFilter = async (building: string) => {
    setBuildingFilter(building)
    try {
      setLoading(true)
      const filteredRooms = await getRooms(building !== 'all' ? building : undefined)
      setRooms(filteredRooms)
    } catch (error) {
      console.error("Error filtering rooms:", error)
      toast.error("Failed to filter rooms")
    } finally {
      setLoading(false)
    }
  }

  // Handle room search
  const handleRoomSearch = async () => {
    if (!searchTerm.trim()) {
      fetchRooms()
      return
    }
    
    try {
      setLoading(true)
      // Client-side filtering
      const allRooms = await getRooms(buildingFilter === 'all' ? undefined : buildingFilter)
      const filteredRooms = allRooms.filter(room => 
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        room.building.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setRooms(filteredRooms)
    } catch (error) {
      console.error("Error searching rooms:", error)
      toast.error("Search failed")
    } finally {
      setLoading(false)
    }
  }
  
  // Handle room form change
  const handleRoomFormChange = (field: string, value: any) => {
    setRoomForm({
      ...roomForm,
      [field]: value
    })
    
    // Clear error when user starts typing
    if (roomError) {
      setRoomError('')
    }
  }
  
  // Open room modal
  const openRoomModal = () => {
    setRoomForm({
      name: '',
      building: availableBuildings[0],
      capacity: 1,
      status: 'available',
      rfidEnabled: false
    })
    setRoomError('')
    setRoomModalOpen(true)
  }
  
  // Close room modal
  const closeRoomModal = () => {
    setRoomModalOpen(false)
    setRoomError('')
  }
  
  // Handle create room
  const handleCreateRoom = async () => {
    // Validate form
    if (!roomForm.name || !roomForm.building) {
      setRoomError('Please fill in all required fields')
      return
    }
    
    if (roomForm.capacity < 1) {
      setRoomError('Capacity must be at least 1')
      return
    }
    
    try {
      setRoomLoading(true)
      
      // Create room in Firestore
      const roomData = {
        name: roomForm.name,
        building: roomForm.building,
        capacity: roomForm.capacity,
        status: roomForm.status,
        rfidEnabled: roomForm.rfidEnabled,
        currentOccupants: 0,
        availableRooms: roomForm.capacity
      }
      
      const roomId = await createRoom(roomData)
      
      if (roomId) {
        toast.success('Room created successfully')
        closeRoomModal()
        
        // Refresh rooms list
        fetchRooms()
      } else {
        throw new Error('Failed to create room')
      }
    } catch (error: any) {
      console.error("Error creating room:", error)
      setRoomError(error.message || 'Failed to create room')
    } finally {
      setRoomLoading(false)
    }
  }
  
  // Edit room functions
  const openEditRoomModal = (room: Room) => {
    setEditRoomForm(room)
    setEditRoomError('')
    setEditRoomModalOpen(true)
  }
  
  const closeEditRoomModal = () => {
    setEditRoomModalOpen(false)
    setEditRoomError('')
  }
  
  const handleEditRoomFormChange = (field: string, value: any) => {
    if (!editRoomForm) return
    
    setEditRoomForm({
      ...editRoomForm,
      [field]: value
    })
    
    // Clear error when user starts typing
    if (editRoomError) {
      setEditRoomError('')
    }
  }
  
  const handleUpdateRoom = async () => {
    if (!editRoomForm) return
    
    try {
      setEditRoomLoading(true)
      
      // Prepare update data
      const updateData: Partial<Room> = {
        name: editRoomForm.name,
        building: editRoomForm.building,
        capacity: editRoomForm.capacity,
        status: editRoomForm.status,
        rfidEnabled: editRoomForm.rfidEnabled
      }
      
      const success = await updateRoom(editRoomForm.id, updateData)
      
      if (success) {
        toast.success('Room updated successfully')
        closeEditRoomModal()
        
        // Refresh rooms list
        fetchRooms()
      } else {
        throw new Error('Failed to update room')
      }
    } catch (error: any) {
      console.error("Error updating room:", error)
      setEditRoomError(error.message || 'Failed to update room')
    } finally {
      setEditRoomLoading(false)
    }
  }

  // Open delete room dialog
  const openDeleteDialog = (room: Room) => {
    setDeleteRoomId(room.id)
    setDeleteRoomName(room.name)
    setDeleteDialogOpen(true)
  }
  
  // Close delete room dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeleteRoomId(null)
    setDeleteRoomName("")
  }
  
  // Handle room deletion
  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return
    
    try {
      setIsDeleting(true)
      
      const success = await deleteRoom(deleteRoomId)
      
      if (success) {
        toast.success(`Room "${deleteRoomName}" deleted successfully`)
        
        // Refresh rooms list
        fetchRooms()
      } else {
        throw new Error(`Failed to delete room "${deleteRoomName}"`)
      }
    } catch (error: any) {
      console.error("Error deleting room:", error)
      toast.error(error.message || `Failed to delete room "${deleteRoomName}"`)
    } finally {
      setIsDeleting(false)
      closeDeleteDialog()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary">Room Management</h1>
          <p className="text-gray-600 mt-2">
            Manage dormitory rooms and facilities
          </p>
        </div>

        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={openRoomModal}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Room
        </Button>
      </div>

      <Card className="border-secondary/20 mb-8">
        <CardHeader className="border-b border-secondary/20">
          <CardTitle className="text-primary flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Dormitory Rooms
          </CardTitle>
          <CardDescription>
            View and manage dormitory rooms across all buildings
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex-1 w-full md:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search rooms by name or building..."
                  className="pl-10 border-secondary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRoomSearch()}
                />
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <Select value={buildingFilter} onValueChange={handleBuildingFilter}>
                <SelectTrigger className="w-[220px] border-secondary/20">
                  <SelectValue placeholder="Filter by building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {availableBuildings.map((building) => (
                    <SelectItem key={building} value={building}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="outline" 
                className="border-secondary/20"
                onClick={() => fetchRooms()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 border rounded-lg border-secondary/20">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || buildingFilter !== 'all' 
                  ? 'No rooms match your search criteria' 
                  : 'There are no rooms in the system yet'}
              </p>
              <Button 
                variant="outline" 
                className="border-secondary/20"
                onClick={openRoomModal}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-secondary/20">
                    <TableHead>Room Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>RFID Access</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id} className="border-secondary/20">
                      <TableCell>
                        <div className="font-medium">{room.name}</div>
                      </TableCell>
                      <TableCell>{room.building}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>
                        {typeof room.currentOccupants === 'number' ? 
                          `${room.currentOccupants}/${room.capacity}` : 
                          '0/0'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          room.status === 'available' 
                            ? 'bg-success' 
                            : room.status === 'occupied' 
                              ? 'bg-warning' 
                              : 'bg-destructive'
                        }>
                          {room.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          room.rfidEnabled 
                            ? 'bg-primary/10 text-primary border-primary/20' 
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }>
                          {room.rfidEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-secondary/20"
                            onClick={() => openEditRoomModal(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-secondary/20"
                            onClick={() => openEditRoomModal(room)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-secondary/20 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => openDeleteDialog(room)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Room Modal */}
      <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Create a new dormitory room in the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="roomName">Room Name/Number</Label>
                <Input
                  id="roomName"
                  value={roomForm.name}
                  onChange={(e) => handleRoomFormChange('name', e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={roomForm.capacity}
                  onChange={(e) => handleRoomFormChange('capacity', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="building">Building</Label>
              <Select 
                value={roomForm.building} 
                onValueChange={(value) => handleRoomFormChange('building', value)}
              >
                <SelectTrigger id="building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {availableBuildings.map((building) => (
                    <SelectItem key={building} value={building}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={roomForm.status} 
                onValueChange={(value) => handleRoomFormChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="rfidEnabled"
                checked={roomForm.rfidEnabled}
                onCheckedChange={(checked) => handleRoomFormChange('rfidEnabled', checked)}
              />
              <Label htmlFor="rfidEnabled" className="flex items-center">
                <Wifi className="h-4 w-4 mr-2" />
                Enable RFID Access Control
              </Label>
            </div>
            {roomError && (
              <div className="text-sm text-red-500 mt-2">{roomError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRoomModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateRoom} disabled={roomLoading}>
              {roomLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Modal */}
      {editRoomForm && (
        <Dialog open={editRoomModalOpen} onOpenChange={setEditRoomModalOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Edit Room</DialogTitle>
              <DialogDescription>
                Update dormitory room information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="editRoomName">Room Name/Number</Label>
                  <Input
                    id="editRoomName"
                    value={editRoomForm.name}
                    onChange={(e) => handleEditRoomFormChange('name', e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="editCapacity">Capacity</Label>
                  <Input
                    id="editCapacity"
                    type="number"
                    min="1"
                    value={editRoomForm.capacity}
                    onChange={(e) => handleEditRoomFormChange('capacity', parseInt(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="editBuilding">Building</Label>
                <Select 
                  value={editRoomForm.building} 
                  onValueChange={(value) => handleEditRoomFormChange('building', value)}
                >
                  <SelectTrigger id="editBuilding">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="editStatus">Status</Label>
                <Select 
                  value={editRoomForm.status} 
                  onValueChange={(value) => handleEditRoomFormChange('status', value)}
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editRfidEnabled"
                  checked={editRoomForm.rfidEnabled}
                  onCheckedChange={(checked) => handleEditRoomFormChange('rfidEnabled', checked)}
                />
                <Label htmlFor="editRfidEnabled" className="flex items-center">
                  <Wifi className="h-4 w-4 mr-2" />
                  Enable RFID Access Control
                </Label>
              </div>
              {editRoomError && (
                <div className="text-sm text-red-500 mt-2">{editRoomError}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditRoomModal}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRoom} disabled={editRoomLoading}>
                {editRoomLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Room Confirmation Dialog 700 ba naman */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete room "{deleteRoomName}"? This action cannot be undone.
              <br/><br/>
              <span className="text-destructive font-medium">
                Note: Rooms with current occupants cannot be deleted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={closeDeleteDialog}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeleteRoom}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 