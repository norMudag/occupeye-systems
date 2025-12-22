"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building, Search, Plus, Edit, Trash2, ArrowLeft, Wifi, Users } from "lucide-react"
import { 
  getDormById, 
  createRoom,
  getRooms,
  Dorm,
  Room,
  updateRoom,
  deleteRoom,
  getRoomsByDormName
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
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
import AddRoom from "./add-room"

// Room form type
interface RoomForm {
  name: string;
  capacity: number;
  status: string;
  rfidEnabled: boolean;
}

export default function DormRoomsPage() {
  const router = useRouter()
  const params = useParams()
  const dormId = params.id as string
  
  // State variables
  const [dorm, setDorm] = useState<Dorm | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Room modal states
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomForm, setRoomForm] = useState<RoomForm>({
    name: '',
    capacity: 1,
    status: 'available',
    rfidEnabled: false
  })
  const [roomError, setRoomError] = useState('')
  
  // Edit room modal states
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false)
  const [editRoomLoading, setEditRoomLoading] = useState(false)
  const [editRoomForm, setEditRoomForm] = useState<Room | null>(null)
  const [editRoomError, setEditRoomError] = useState('')

  // Room deletion state
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null)
  const [deleteRoomName, setDeleteRoomName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Show add room form
  const [showAddRoom, setShowAddRoom] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    if (!dormId) return
    fetchData()
  }, [dormId, router])

  // Fetch dorm details and rooms
  const fetchData = async () => {
    setLoading(true)
    try {
      // Get dorm details
      const dormData = await getDormById(dormId)
      if (!dormData) {
        toast.error("Dormitory not found")
        router.push("/admin/dorms")
        return
      }
      setDorm(dormData)
      
      // Get rooms for this dorm
      if (dormData.name) {
        const roomsData = await getRoomsByDormName(dormData.name)
        setRooms(roomsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  // Filter rooms based on search term
  const filteredRooms = rooms.filter(room => {
    return room.name.toLowerCase().includes(searchTerm.toLowerCase());
  })

  // Open room creation modal
  const openRoomModal = () => {
    setRoomForm({
      name: '',
      capacity: 1,
      status: 'available',
      rfidEnabled: false
    })
    setRoomError('')
    setRoomModalOpen(true)
  }
  
  // Close room creation modal
  const closeRoomModal = () => {
    setRoomModalOpen(false)
    setRoomError('')
  }

  // Handle room form changes
  const handleRoomFormChange = (field: string, value: any) => {
    setRoomForm(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (roomError) setRoomError('')
  }

  // Create room
  const handleCreateRoom = async () => {
    // Validate form
    if (!roomForm.name) {
      setRoomError('Room name is required')
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
        dormId: dormId,
        dormName: dorm?.name || '',
        capacity: roomForm.capacity,
        status: roomForm.status,
        rfidEnabled: roomForm.rfidEnabled,
        availableRooms: roomForm.capacity
      }
      
      const roomId = await createRoom(roomData)
      
      if (roomId) {
        toast.success('Room created successfully')
        closeRoomModal()
        
        // Refresh rooms list
        fetchData()
        
        // Update dorm room count
        if (dorm) {
          const updatedRoomCount = dorm.roomCount + 1
          await updateDormRoomCount(updatedRoomCount)
        }
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

  // Update dorm room count
  const updateDormRoomCount = async (count: number) => {
    try {
      // Update the dorm with new room count
      // This function doesn't exist yet, but would be implemented in admin-firestore.ts
      // For now we just update the UI
      setDorm(prev => prev ? {...prev, roomCount: count} : null)
    } catch (error) {
      console.error("Error updating dorm room count:", error)
    }
  }

  // Open edit room modal
  const openEditRoomModal = (room: Room) => {
    setEditRoomForm(room)
    setEditRoomError('')
    setEditRoomModalOpen(true)
  }
  
  // Close edit room modal
  const closeEditRoomModal = () => {
    setEditRoomModalOpen(false)
    setEditRoomError('')
  }
  
  // Handle edit room form change
  const handleEditRoomFormChange = (field: string, value: any) => {
    if (editRoomForm) {
      setEditRoomForm({
        ...editRoomForm,
        [field]: value
      })
    }
    
    // Clear error when user types
    setEditRoomError('')
  }

  // Update room
  const handleUpdateRoom = async () => {
    if (!editRoomForm) return
    
    // Validate form
    if (!editRoomForm.name) {
      setEditRoomError('Room name is required')
      return
    }
    
    if (editRoomForm.capacity < 1) {
      setEditRoomError('Capacity must be at least 1')
      return
    }
    
    try {
      setEditRoomLoading(true)
      
      // Update room in Firestore
      const updated = await updateRoom(editRoomForm.id, {
        name: editRoomForm.name,
        capacity: Number(editRoomForm.capacity),
        status: editRoomForm.status,
        rfidEnabled: editRoomForm.rfidEnabled
      })
      
      if (updated) {
        toast.success('Room updated successfully')
        closeEditRoomModal()
        
        // Refresh rooms list
        fetchData()
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

  // Open delete dialog
  const openDeleteDialog = (id: string, name: string) => {
    setDeleteRoomId(id)
    setDeleteRoomName(name)
    setDeleteDialogOpen(true)
  }
  
  // Close delete dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeleteRoomId(null)
    setDeleteRoomName("")
  }
  
  // Delete room
  const handleDeleteRoom = async () => {
    if (!deleteRoomId) return
    
    try {
      setIsDeleting(true)
      
      const success = await deleteRoom(deleteRoomId)
      
      if (success) {
        toast.success(`Room "${deleteRoomName}" deleted successfully`)
        
        // Refresh rooms list
        fetchData()
        
        // Update dorm room count
        if (dorm) {
          const updatedRoomCount = Math.max(0, dorm.roomCount - 1)
          await updateDormRoomCount(updatedRoomCount)
        }
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

  // Handle room added successfully
  const handleRoomAdded = () => {
    setShowAddRoom(false)
    fetchData() // Refresh the room list
    toast.success("Room added successfully")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mb-4"></div>
          <h3 className="text-lg font-medium">Loading...</h3>
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
          onClick={() => router.push("/admin/dorms")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dorms
        </Button>
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {dorm?.name} - Rooms Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage rooms for {dorm?.name} dormitory
            </p>
          </div>
          
          <Button 
            className="bg-primary hover:bg-primary/90 rounded-full px-4 shadow-md"
            onClick={() => setShowAddRoom(true)}
          >
            <Plus className="h-4 w-4 mr-2 text-white" />
            <span className="text-white">Add New Room</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Rooms</p>
                <h3 className="text-3xl font-bold text-blue-900 mt-1">{rooms.length}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-200 rounded-full flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Available Rooms</p>
                <h3 className="text-3xl font-bold text-green-900 mt-1">
                  {rooms.filter(room => room.status === 'available').length}
                </h3>
              </div>
              <div className="h-12 w-12 bg-green-200 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Total Capacity</p>
                <h3 className="text-3xl font-bold text-amber-900 mt-1">
                  {rooms.reduce(
                    (acc, room) => acc + (room.occupantIds?.length ?? 0),
                    0
                  )}{" "}
                  /{" "}
                  {rooms.reduce((acc, room) => acc + room.capacity, 0)}
                </h3>
              </div>
              <div className="h-12 w-12 bg-amber-200 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {showAddRoom ? (
        <div className="mb-8">
          <Card className="border-2 border-primary/10 shadow-md">
            <CardContent className="pt-6">
              <AddRoom 
                dormId={dormId}
                dormName={dorm?.name || ""}
                onSuccess={handleRoomAdded}
                onCancel={() => setShowAddRoom(false)}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
      
      <Card className="border-none shadow-md">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <CardTitle className="text-xl flex items-center">
              <Building className="h-5 w-5 mr-2 text-primary" />
              Rooms Management
            </CardTitle>
            
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search rooms..."
                  className="pl-9 w-full md:w-[200px] h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {rooms.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 m-6 rounded-xl bg-gray-50">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Building className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No rooms found</h3>
              <p className="text-gray-500 mb-4">Get started by adding your first room to this dormitory</p>
              <Button 
                variant="outline" 
                onClick={() => setShowAddRoom(true)}
                className="mx-auto rounded-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Room
              </Button>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 m-6 rounded-xl bg-gray-50">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No matching rooms</h3>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                }}
                className="mx-auto rounded-full"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-secondary/20">
                    <TableHead>Room Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Occupancy</TableHead>
                    <TableHead>RFID Access</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map((room) => (
                    <TableRow key={room.id} className="border-secondary/20">
                      <TableCell className="font-medium">
                        {room.name}
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
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell>
                        {`${room.occupantIds?.length ?? 0}/${room.capacity}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                        {room.rfidEnabled ? (
                            <>
                              <Wifi className="h-4 w-4 text-success mr-1" />
                              <span className="text-success">Enabled</span>
                            </>
                        ) : (
                            <span className="text-gray-400">Disabled</span>
                        )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary"
                            asChild
                          >
                            <Link href={`/admin/dorms/${dormId}/rooms/${room.id}`}>
                              <Users className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => openEditRoomModal(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => openDeleteDialog(room.id, room.name)}
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

      {/* Delete Room Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-red-50 mb-4">
              <Trash2 className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Delete Room</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete <span className="font-semibold text-black">"{deleteRoomName}"</span>?
              <br/>This action cannot be undone.
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warning
                </p>
                <p>Rooms with current occupants cannot be deleted.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-center sm:space-x-4 pt-2">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={closeDeleteDialog}
              className="w-full sm:w-auto rounded-lg border-gray-300"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white rounded-lg focus:ring-red-500"
              onClick={handleDeleteRoom}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Room Modal */}
      <Dialog open={editRoomModalOpen} onOpenChange={setEditRoomModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Room</DialogTitle>
            <DialogDescription>
              Update room details and settings for {editRoomForm?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">Room Name</Label>
                <Input
                  id="name"
                  value={editRoomForm?.name || ''}
                  onChange={(e) => handleEditRoomFormChange('name', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="capacity" className="text-sm font-medium">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={editRoomForm?.capacity || 1}
                  onChange={(e) => handleEditRoomFormChange('capacity', parseInt(e.target.value))}
                  className="h-10"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="status" className="text-sm font-medium">Status</Label>
                <Select
                  value={editRoomForm?.status || 'available'}
                  onValueChange={(value) => handleEditRoomFormChange('status', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
              <Switch
                id="rfidEnabled"
                checked={editRoomForm?.rfidEnabled || false}
                onCheckedChange={(checked) => handleEditRoomFormChange('rfidEnabled', checked)}
              />
              <Label htmlFor="rfidEnabled" className="flex items-center cursor-pointer">
                <Wifi className="h-4 w-4 mr-2 text-primary" />
                RFID Access Enabled
              </Label>
            </div>
            {editRoomError && (
              <div className="text-sm text-red-500 mt-2 bg-red-50 p-3 rounded-lg">
                {editRoomError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEditRoomModal} className="rounded-lg">
              Cancel
            </Button>
            <Button onClick={handleUpdateRoom} disabled={editRoomLoading} className="rounded-lg bg-primary hover:bg-primary/90">
              {editRoomLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : 'Update Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 