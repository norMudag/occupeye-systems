"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Building, Save, Loader2, Plus } from "lucide-react"
import { createRoom, getDormById, Room } from "@/app/utils/admin-firestore"
import { Checkbox } from "@/components/ui/checkbox"

interface AddRoomProps {
  dormId: string;
  dormName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddRoom({ dormId, dormName, onSuccess, onCancel }: AddRoomProps) {
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    capacity: 1,
    status: "available",
    rfidEnabled: false
  })

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === "capacity" ? parseInt(value) || 0 : value
    }))
  }

  // Handle status change
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value
    }))
  }

  // Handle RFID toggle
  const handleRfidToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      rfidEnabled: checked
    }))
  }

  // Save room data
  const handleSave = async () => {
    setSaving(true)
    try {
      if (!formData.name) {
        toast.error("Room name is required")
        setSaving(false)
        return
      }

      const roomData: Omit<Room, 'id'> = {
        name: formData.name,
        building: formData.name,
        dormId: dormId,
        dormName: dormName,
        capacity: formData.capacity,
        status: formData.status,
        rfidEnabled: formData.rfidEnabled,
        availableRooms: 0,
        currentOccupants: 0
      }

      await createRoom(roomData)
      toast.success("Room added successfully")
      onSuccess()
    } catch (error) {
      console.error("Error adding room:", error)
      toast.error("Failed to add room")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-0 shadow-md rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Plus className="h-5 w-5 mr-2 text-primary" />
          Add New Room
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Room Number/Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. 101"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder="Number of students"
              value={formData.capacity}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 pt-8">
            <Checkbox 
              id="rfidEnabled" 
              checked={formData.rfidEnabled}
              onCheckedChange={handleRfidToggle}
            />
            <Label htmlFor="rfidEnabled">RFID Access Enabled</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2 text-white" />
              <span className="text-white">Save Room</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 