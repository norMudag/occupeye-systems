"use client"
//should counts the vacant, maintenance, and occupied
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { ArrowLeft, Building, Save, Loader2 } from "lucide-react"
import { getDormById, updateDorm, getUsers, Dorm, User } from "@/app/utils/admin-firestore"

export default function EditDorm({ params }: { params: { id: string } }) {
  const router = useRouter()
  const dormId = params.id
  
  // State variables
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dorm, setDorm] = useState<Dorm | null>(null)
  const [managers, setManagers] = useState<User[]>([])
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    status: "vacant",
    imageUrl: "",
    sex: "" // Add sex field
  })

  // Fetch dorm data on component mount
  useEffect(() => {
    const fetchDormData = async () => {
      setLoading(true)
      try {
        const dormData = await getDormById(dormId)
        if (dormData) {
          setDorm(dormData)
          setFormData({
            name: dormData.name,
            location: dormData.location,
            status: dormData.status,
            imageUrl: dormData.imageUrl || "",
            sex: dormData.sex || "" // Initialize sex field
          })
          setSelectedManagers(dormData.managerIds || [])
        } else {
          toast.error("Dorm not found")
          router.push("/admin/dorms")
        }
        
        // Fetch managers
        const userData = await getUsers()
        const managerUsers = userData.filter(user => user.role === 'manager')
        setManagers(managerUsers)
      } catch (error) {
        console.error("Error fetching dorm:", error)
        toast.error("Failed to load dorm data")
      } finally {
        setLoading(false)
      }
    }

    fetchDormData()
  }, [dormId, router])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle status change
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      status: value
    }))
  }

  // Handle manager selection
  const toggleManagerSelection = (managerId: string) => {
    setSelectedManagers(prev => {
      if (prev.includes(managerId)) {
        console.log(`Removing manager ${managerId} from dorm ${dormId}`)
        return prev.filter(id => id !== managerId)
      } else {
        console.log(`Adding manager ${managerId} to dorm ${dormId}`)
        return [...prev, managerId]
      }
    })
  }

  // Save dorm data
  const handleSave = async () => {
    setSaving(true)
    try {
      if (!formData.name || !formData.location) {
        toast.error("Name and location are required")
        return
      }

      // Log manager changes
      if (dorm && JSON.stringify(dorm.managerIds) !== JSON.stringify(selectedManagers)) {
        console.log('Manager assignments changed:')
        console.log('Previous managers:', dorm.managerIds)
        console.log('New managers:', selectedManagers)
      }

      const updatedDorm = {
        ...dorm,
        name: formData.name,
        location: formData.location,
        status: formData.status,
        imageUrl: formData.imageUrl,
        sex: formData.sex || null, // Include sex field, default to null if not specified
        managerIds: selectedManagers,
        updatedAt: new Date().toISOString()
      }

      await updateDorm(dormId, updatedDorm)
      toast.success("Dorm updated successfully")
      router.push("/admin/dorms")
    } catch (error) {
      console.error("Error updating dorm:", error)
      toast.error("Failed to update dorm")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-lg font-medium">Loading dorm data...</h3>
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
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Edit Dorm</h1>
            <p className="text-gray-600 mt-1">
              Update dormitory information and manager assignments
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Building className="h-5 w-5 mr-2 text-primary" />
                Dorm Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dorm Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter dorm name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Enter dorm location"
                    value={formData.location}
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
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="Enter image URL"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sex">Dormitory Type</Label>
                <Select
                  value={formData.sex}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dormitory type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-md rounded-xl">
            <CardHeader>
              <CardTitle className="text-xl">Assign Managers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {managers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No managers available</p>
                ) : (
                  managers.map((manager) => (
                    <div key={manager.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`manager-${manager.id}`}
                        checked={selectedManagers.includes(manager.id)}
                        onChange={() => toggleManagerSelection(manager.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`manager-${manager.id}`} className="text-sm">
                        {manager.firstName} {manager.lastName}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
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
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
} 