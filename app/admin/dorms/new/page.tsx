"use client"
//Additional
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Building, Plus, Upload, Check, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createDorm, getUsers, User } from "@/app/utils/admin-firestore"
import { uploadLocalImage, createImagePreview } from "@/app/utils/image-upload"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"

export default function AddDorm() {
  const router = useRouter()
  
  // State variables
  const [loading, setLoading] = useState(false)
  const [managers, setManagers] = useState<User[]>([])
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    status: "vacant",
    capacity: 0, // Keep this field to match the Dorm interface, but set it to 0
    roomCount: 0,
    occupancyRate: 0,
    sex: "" // Add sex field
  })
  
  // Error state
  const [formError, setFormError] = useState("")

  // Fetch managers on component mount
  useEffect(() => {
    fetchManagers()
  }, [])
  
  // Fetch managers
  const fetchManagers = async () => {
    try {
      const users = await getUsers()
      const managerUsers = users.filter(user => user.role === "manager")
      setManagers(managerUsers)
    } catch (error) {
      console.error("Error fetching managers:", error)
      toast.error("Failed to fetch managers")
    }
  }
  
  // Handle form field changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user types
    if (formError) setFormError("")
  }
  
  // Handle image selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    const file = files[0]
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file")
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }
    
    setImageFile(file)
    
    try {
      // Create preview URL using our utility function
      const previewUrl = await createImagePreview(file)
      setImagePreview(previewUrl)
    } catch (error) {
      console.error("Error creating image preview:", error)
      toast.error("Failed to preview image")
    }
  }

  // Toggle manager selection
  const toggleManagerSelection = (managerId: string) => {
    setSelectedManagers(prev => 
      prev.includes(managerId)
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    )
  }
  
  // Remove selected image
  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Upload image to local storage
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null
    
    try {
      setUploadingImage(true)
      
      // Upload image to local storage using our utility function
      const imagePath = await uploadLocalImage(imageFile, "dorms")
      
      return imagePath
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    } finally {
      setUploadingImage(false)
    }
  }
  
  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.name) {
      setFormError("Dorm name is required")
      return
    }
    
    if (!formData.location) {
      setFormError("Location is required")
      return
    }
    
    setLoading(true)
    
    try {
      // Upload image if selected
      let imagePath = null
      if (imageFile) {
        try {
          setUploadingImage(true)
          toast.info("Uploading image...")
          imagePath = await uploadImage()
          if (!imagePath) {
            toast.error("Failed to upload image, but continuing with dorm creation")
          }
        } catch (error) {
          console.error("Error uploading image:", error)
          toast.error("Failed to upload image, but continuing with dorm creation")
        } finally {
          setUploadingImage(false)
        }
      }
      
      // Create dorm in Firestore
      const dormData = {
        ...formData,
        capacity: 0, // Explicitly set to 0 as it will be calculated from rooms
        managerIds: selectedManagers,
        imageUrl: imagePath || "", // Store only the path in Firestore
        sex: formData.sex || null, // Include sex field, default to null if not specified
        createdAt: new Date().toISOString()
      }
      
      // Log selected managers for confirmation
      console.log(`Assigning managers to new dorm: ${selectedManagers.join(', ')}`)
      
      toast.info("Creating dormitory...")
      const dormId = await createDorm(dormData)
      
      if (dormId) {
        toast.success("Dormitory created successfully")
        console.log(`Dormitory created with ID: ${dormId}`)
        router.push("/admin/dorms")
      } else {
        throw new Error("Failed to create dormitory")
      }
    } catch (error: any) {
      console.error("Error creating dorm:", error)
      setFormError(error.message || "Failed to create dormitory")
      toast.error(error.message || "Failed to create dormitory")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/dorms">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dorms
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-primary">Add New Dormitory</h1>
        <p className="text-gray-600 mt-1">Create a new dormitory and assign managers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dorm details form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl">Dormitory Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Dormitory Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Enter dormitory name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input 
                      id="location" 
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="Enter location"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status}
                      onValueChange={(value) => handleChange('status', value)}
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
                  <div>
                    <Label htmlFor="sex">Dormitory Type</Label>
                    <Select 
                      value={formData.sex}
                      onValueChange={(value) => handleChange('sex', value)}
                      required
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
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Enter dormitory description"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="image">Dormitory Image</Label>
                  <div className="mt-2 border-2 border-dashed rounded-md p-4 border-gray-300">
                    {imagePreview ? (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Dorm preview" 
                          className="w-full h-40 object-cover rounded-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 rounded-full h-8 w-8 p-0"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm font-medium text-gray-600">Click to upload image</span>
                        <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="text-destructive text-sm">{formError}</div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/admin/dorms")}
                    disabled={loading || uploadingImage}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={loading || uploadingImage}
                  >
                    {loading ? (
                      <>
                        <span className="animate-pulse mr-2">⏳</span>
                        {uploadingImage ? "Uploading..." : "Creating..."}
                      </>
                    ) : "Create Dormitory"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Manager assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Assign Managers</CardTitle>
          </CardHeader>
          <CardContent>
            {managers.length === 0 ? (
              <p className="text-gray-500 text-sm">No managers available. Add managers first.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-2">Select managers for this dormitory:</p>
                {managers.map(manager => (
                  <div key={manager.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`manager-${manager.id}`} 
                      checked={selectedManagers.includes(manager.id)}
                      onCheckedChange={() => toggleManagerSelection(manager.id)}
                    />
                    <Label 
                      htmlFor={`manager-${manager.id}`}
                      className="cursor-pointer flex-1"
                    >
                      {manager.firstName} {manager.lastName}
                      <span className="block text-xs text-gray-500">{manager.email}</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/admin/manager">
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Manager
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 