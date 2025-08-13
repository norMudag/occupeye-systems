"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Calendar, CreditCard, Camera, Building } from "lucide-react"
import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { getDormById } from "@/app/utils/admin-firestore"

export default function ManagerProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { currentUser, userData } = useAuth()
  const auth = getAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    employeeId: "",
    department: "",
    position: "",
    address: "",
    dateOfBirth: "",
    emergencyContact: "",
    rfidCard: "",
    joinDate: "",
    bio: "",
    profileImageUrl: "",
    managedBuildings: [] as string[],
    managedDormId: "",
    managedDormName: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [passwordError, setPasswordError] = useState("")

  // Sample dormitories list
  const sampleDormitories = [
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
  ]

  // Fetch user data from Firestore when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return

      try {
        const userDocRef = doc(db, "users", currentUser.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          
          // Fetch dorm name if managedDormId exists
          let dormName = ""
          if (data.managedDormId) {
            try {
              const dormData = await getDormById(data.managedDormId)
              if (dormData) {
                dormName = dormData.name
              }
            } catch (error) {
              console.error("Error fetching dorm data:", error)
            }
          }
          
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            employeeId: data.employeeId || "",
            department: data.department || "",
            position: data.position || "",
            address: data.address || "",
            dateOfBirth: data.dateOfBirth || "",
            emergencyContact: data.emergencyContact || "",
            rfidCard: data.rfidCard || "",
            joinDate: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : "",
            bio: data.bio || "",
            profileImageUrl: data.profileImageUrl || "",
            managedBuildings: data.managedBuildings || [],
            managedDormId: data.managedDormId || "",
            managedDormName: dormName,
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Failed to load profile data")
      }
    }

    fetchUserData()
  }, [currentUser])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentUser) return
    
    const file = e.target.files[0]
    
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }
    
    setIsUploading(true)
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', currentUser.uid)
      
      // Send the file to the server
      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }
      
      const data = await response.json()
      
      // Update Firestore with the image URL
      const userDocRef = doc(db, "users", currentUser.uid)
      await updateDoc(userDocRef, {
        profileImageUrl: data.imageUrl
      })
      
      // Update local state
      setProfile({
        ...profile,
        profileImageUrl: data.imageUrl
      })
      
      toast.success('Profile image updated successfully')
    } catch (error) {
      console.error('Error uploading profile image:', error)
      toast.error('Failed to upload profile image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handlePasswordChange = async () => {
    if (!currentUser) {
      toast.error("You must be logged in to change your password")
      return
    }

    // Validate form
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError("All fields are required")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    setIsPasswordLoading(true)
    setPasswordError("")

    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(
        currentUser.email || "",
        passwordForm.currentPassword
      )
      
      await reauthenticateWithCredential(currentUser, credential)
      
      // Update the password
      await updatePassword(currentUser, passwordForm.newPassword)
      
      toast.success("Password updated successfully")
      
      // Clear form
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      console.error("Error updating password:", error)
      
      if (error.code === "auth/wrong-password") {
        setPasswordError("Current password is incorrect")
      } else if (error.code === "auth/weak-password") {
        setPasswordError("Password is too weak")
      } else {
        setPasswordError("Failed to update password")
      }
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const handleSave = async () => {
    if (!currentUser) {
      toast.error("You must be logged in to update your profile")
      return
    }
    
    setIsLoading(true)
    
    try {
      const userDocRef = doc(db, "users", currentUser.uid)
      
      // Create an object with only the defined fields to update
      const updateData: { [key: string]: any } = {}
      
      // Only add fields that have values
      if (profile.firstName) updateData.firstName = profile.firstName
      if (profile.lastName) updateData.lastName = profile.lastName
      if (profile.email) updateData.email = profile.email
      if (profile.phone !== undefined) updateData.phone = profile.phone
      if (profile.address !== undefined) updateData.address = profile.address
      if (profile.dateOfBirth !== undefined) updateData.dateOfBirth = profile.dateOfBirth
      if (profile.emergencyContact !== undefined) updateData.emergencyContact = profile.emergencyContact
      if (profile.bio !== undefined) updateData.bio = profile.bio
      if (profile.department !== undefined) updateData.department = profile.department
      if (profile.position !== undefined) updateData.position = profile.position
      
      // Update Firestore with the profile data
      await updateDoc(userDocRef, updateData)
      
      toast.success("Profile updated successfully")
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  // If no user is logged in or data is still loading
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Please log in to view your profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Manager Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and account settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="border-secondary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-secondary">
                      <AvatarImage 
                        src={profile.profileImageUrl || "/placeholder-user.jpg"} 
                        alt="Profile" 
                      />
                      <AvatarFallback className="bg-secondary text-black text-xl">
                        {profile.firstName[0]}
                        {profile.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                      onClick={handleUploadClick}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                      <Camera className="h-4 w-4" />
                      )}
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-primary">
                      {profile.firstName} {profile.lastName}
                    </h3>
                    <p className="text-gray-600">{profile.position}</p>
                    <Badge className="mt-2 bg-primary text-white">{profile.department}</Badge>
                  </div>
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">ID: {profile.employeeId}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">Joined: {profile.joinDate}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/20 mt-6">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Managed Dormitories</CardTitle>
                <CardDescription>
                  Buildings assigned to you by administration
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {(profile.managedBuildings && profile.managedBuildings.length > 0) || profile.managedDormId ? (
                  <div className="space-y-2">
                    {profile.managedDormId && profile.managedDormName && (
                      <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <Building className="h-5 w-5 text-blue-600" />
                        <div>
                          <span className="font-medium text-blue-800">{profile.managedDormName}</span>
                          <p className="text-xs text-blue-600">Primary assigned dormitory</p>
                        </div>
                      </div>
                    )}
                    {profile.managedBuildings.map((building, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-primary" />
                        <span className="text-sm text-gray-600">{building}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No dormitories assigned yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Dormitories are assigned by administrators
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="bg-muted border border-secondary/20">
                <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Personal Information
                </TabsTrigger>
                <TabsTrigger value="work" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Work Details
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <Card className="border-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20">
                    <div>
                      <CardTitle className="text-primary">Personal Information</CardTitle>
                      <CardDescription>Update your personal details and contact information</CardDescription>
                    </div>
                    {!isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="border-secondary/20 text-primary hover:bg-secondary/10"
                      >
                        Edit Profile
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        {isEditing ? (
                          <Input
                            id="firstName"
                            value={profile.firstName}
                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.firstName}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        {isEditing ? (
                          <Input
                            id="lastName"
                            value={profile.lastName}
                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.lastName}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.email}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        {isEditing ? (
                          <Input
                            id="phone"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.phone}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        {isEditing ? (
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={profile.dateOfBirth}
                            onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.dateOfBirth}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="emergencyContact">Emergency Contact</Label>
                        {isEditing ? (
                          <Input
                            id="emergencyContact"
                            value={profile.emergencyContact}
                            onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.emergencyContact}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <Label htmlFor="address">Address</Label>
                      {isEditing ? (
                        <Textarea
                          id="address"
                          value={profile.address}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          className="border-secondary/20"
                        />
                      ) : (
                        <p className="font-medium mt-1">{profile.address}</p>
                      )}
                    </div>
                    <div className="mt-6">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          className="border-secondary/20"
                          placeholder="Tell us about yourself..."
                        />
                      ) : (
                        <p className="font-medium mt-1">{profile.bio}</p>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex space-x-4 mt-6">
                        <Button
                          onClick={handleSave}
                          disabled={isLoading}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={handleCancel} className="border-secondary/20">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="work" className="space-y-6">
                <Card className="border-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20">
                    <div>
                    <CardTitle className="text-primary">Work Information</CardTitle>
                    <CardDescription>Your employment details and responsibilities</CardDescription>
                    </div>
                    {!isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="border-secondary/20 text-primary hover:bg-secondary/10"
                      >
                        Edit Details
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    {isEditing && (
                      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm">
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>
                            <strong>Note:</strong> Managed dormitories can only be assigned or modified by administrators. Please contact the system administrator if you need changes to your dormitory assignments.
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Employee ID</Label>
                        <p className="font-medium mt-1">{profile.employeeId}</p>
                      </div>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        {isEditing ? (
                          <Input
                            id="department"
                            value={profile.department}
                            onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                        <p className="font-medium mt-1">{profile.department}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="position">Position</Label>
                        {isEditing ? (
                          <Input
                            id="position"
                            value={profile.position}
                            onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                            className="border-secondary/20"
                          />
                        ) : (
                        <p className="font-medium mt-1">{profile.position}</p>
                        )}
                      </div>
                      <div>
                        <Label>Join Date</Label>
                        <p className="font-medium mt-1">{profile.joinDate}</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Label htmlFor="managedDormitories">Managed Dormitories</Label>
                      <div className="mt-2 space-y-2">
                        {(profile.managedBuildings.length > 0 || profile.managedDormId) ? (
                          <>
                            {profile.managedDormId && profile.managedDormName && (
                              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                                <div className="flex items-center space-x-3">
                                  <Building className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <p className="font-medium text-blue-800">{profile.managedDormName}</p>
                                    <p className="text-xs text-blue-600">Primary assigned dormitory</p>
                                  </div>
                                </div>
                                <Badge className="bg-blue-600">Primary</Badge>
                              </div>
                            )}
                            {profile.managedBuildings.map((dormitory, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 p-2 border border-secondary/20 rounded"
                            >
                              <Building className="h-4 w-4 text-primary" />
                              <span className="font-medium">{dormitory}</span>
                            </div>
                            ))}
                          </>
                        ) : (
                          <div className="text-center py-4 border border-dashed border-secondary/20 rounded-md">
                            <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              No dormitories assigned yet
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Dormitories are assigned by administrators
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">
                        * Only administrators can assign or modify managed dormitories
                      </p>
                    </div>

                    {isEditing && (
                      <div className="flex space-x-4 mt-6">
                        <Button
                          onClick={handleSave}
                          disabled={isLoading}
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={handleCancel} className="border-secondary/20">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card className="border-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20">
                    <div>
                    <CardTitle className="text-primary">Security Settings</CardTitle>
                    <CardDescription>Manage your account security and password</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {passwordError && (
                      <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-600 mb-4">
                        {passwordError}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Enter current password"
                        className="border-secondary/20"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password"
                        className="border-secondary/20"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        className="border-secondary/20"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={handlePasswordChange}
                      disabled={isPasswordLoading}
                    >
                      {isPasswordLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20">
                    <div>
                    <CardTitle className="text-primary">Access Card Management</CardTitle>
                    <CardDescription>Manage your access card for building entry</CardDescription>
                    </div>
                    {!isEditing && (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="border-secondary/20 text-primary hover:bg-secondary/10"
                      >
                        Edit RFID
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-4 border border-secondary/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Label htmlFor="rfidCard">RFID Card Number</Label>
                              <Input
                                id="rfidCard"
                                value={profile.rfidCard || ""}
                                onChange={(e) => setProfile({ ...profile, rfidCard: e.target.value })}
                                className="border-secondary/20"
                                placeholder="Enter RFID card number"
                              />
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">Access Card: {profile.rfidCard || "Not assigned"}</p>
                              <p className="text-sm text-gray-600">Status: {profile.rfidCard ? "Active" : "Not assigned"}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className={`${profile.rfidCard ? "bg-success" : "bg-muted"} text-white`}>
                        {profile.rfidCard ? "Active" : "None"}
                      </Badge>
                    </div>

                    {isEditing ? (
                      <div className="flex space-x-4 mt-6">
                      <Button
                          onClick={handleSave}
                          disabled={isLoading}
                          className="bg-primary hover:bg-primary/90 text-white"
                      >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button variant="outline" onClick={handleCancel} className="border-secondary/20">
                          Cancel
                      </Button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>
                            For security reasons, RFID card changes require manager approval. Please contact your system administrator for assistance.
                          </span>
                        </div>
                      <Button
                        variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Report Lost Card
                      </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-secondary/20">
                  <CardHeader className="border-b border-secondary/20">
                    <CardTitle className="text-primary">Login History</CardTitle>
                    <CardDescription>Recent account login activities</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border-b border-secondary/10">
                        <div>
                          <p className="font-medium">Login from Windows PC</p>
                          <p className="text-sm text-gray-600">IP: 192.168.1.45</p>
                        </div>
                        <p className="text-sm text-gray-600">Today, 10:23 AM</p>
                      </div>
                      <div className="flex items-center justify-between p-3 border-b border-secondary/10">
                        <div>
                          <p className="font-medium">Login from Mobile Device</p>
                          <p className="text-sm text-gray-600">IP: 203.45.78.123</p>
                        </div>
                        <p className="text-sm text-gray-600">Yesterday, 8:45 PM</p>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium">Login from Windows PC</p>
                          <p className="text-sm text-gray-600">IP: 192.168.1.45</p>
                        </div>
                        <p className="text-sm text-gray-600">2 days ago, 9:15 AM</p>
                      </div>
                    </div>
                    <Button variant="link" className="text-primary p-0 h-auto mt-4">
                      View all login history
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
