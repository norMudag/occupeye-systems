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
import { Mail, Calendar, CreditCard, Camera, Upload, Loader2 } from "lucide-react"
import Navigation from "@/components/navigation"
import { useAuth } from "@/lib/AuthContext"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StudentProfile() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { currentUser, userData } = useAuth()
  const auth = getAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add sex to the profile state
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    studentId: "",
    course: "",
    yearLevel: "",
    address: "",
    dateOfBirth: "",
    emergencyContact: "",
    rfidCard: "",
    joinDate: "",
    bio: "",
    profileImageUrl: "",
    assignedRoom: "",
    assignedBuilding: "",
    roomApplicationStatus: "",
    roomApplicationId: "",
    sex: "", // Add sex field
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [passwordError, setPasswordError] = useState("")

  // Fetch user data from Firestore when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return

      try {
        const userDocRef = doc(db, "users", currentUser.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            studentId: data.studentId || "",
            course: data.course || "",
            yearLevel: data.yearLevel || "",
            address: data.address || "",
            dateOfBirth: data.dateOfBirth || "",
            emergencyContact: data.emergencyContact || "",
            rfidCard: data.rfidCard || "",
            joinDate: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : "",
            bio: data.bio || "",
            profileImageUrl: data.profileImageUrl || "",
            assignedRoom: data.assignedRoom || "",
            assignedBuilding: data.assignedBuilding || "",
            roomApplicationStatus: data.roomApplicationStatus || "",
            roomApplicationId: data.roomApplicationId || "",
            sex: data.sex || "", // Add sex from user data
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
      if (profile.course !== undefined) updateData.course = profile.course
      if (profile.yearLevel !== undefined) updateData.yearLevel = profile.yearLevel
      if (profile.sex !== undefined) updateData.sex = profile.sex // Add sex to update data
      
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
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Profile Settings</h1>
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
                    <p className="text-gray-600">{profile.course}</p>
                    <Badge className="mt-2 bg-secondary text-black">{profile.yearLevel}</Badge>
                  </div>
                  <div className="w-full space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">RFID: {profile.rfidCard}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-gray-600">Joined: {profile.joinDate}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="bg-muted border border-secondary/20">
                <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Personal Information
                </TabsTrigger>
                <TabsTrigger value="academic" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Academic Details
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
                      <div>
                        <Label htmlFor="sex">Sex</Label>
                        {isEditing ? (
                          <Select
                            value={profile.sex}
                            onValueChange={(value) => setProfile({ ...profile, sex: value })}
                          >
                            <SelectTrigger className="border-secondary/20">
                              <SelectValue placeholder="Select your sex" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium mt-1">{profile.sex || "Not specified"}</p>
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

              <TabsContent value="academic" className="space-y-6">
                <Card className="border-secondary/20">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20">
                    <div>
                    <CardTitle className="text-primary">Academic Information</CardTitle>
                    <CardDescription>Your academic details and university information</CardDescription>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Student ID</Label>
                        <p className="font-medium mt-1">{profile.studentId}</p>
                      </div>
                      <div>
                        <Label htmlFor="course">Course</Label>
                        {isEditing ? (
                          <Input
                            id="course"
                            value={profile.course}
                            onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                            className="border-secondary/20"
                            placeholder="Enter your course"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.course || "Not set"}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="yearLevel">Year Level</Label>
                        {isEditing ? (
                          <Input
                            id="yearLevel"
                            value={profile.yearLevel}
                            onChange={(e) => setProfile({ ...profile, yearLevel: e.target.value })}
                            className="border-secondary/20"
                            placeholder="Enter your year level"
                          />
                        ) : (
                          <p className="font-medium mt-1">{profile.yearLevel || "Not set"}</p>
                        )}
                      </div>
                      <div>
                        <Label>RFID Card</Label>
                        <p className="font-medium mt-1">{profile.rfidCard || "Not assigned"}</p>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex justify-end space-x-2 mt-6">
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          className="border-secondary/20"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleSave}
                          className="bg-primary hover:bg-primary/90 text-white"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border-secondary/20">
                  <CardHeader className="border-b border-secondary/20">
                    <CardTitle className="text-primary">Housing Information</CardTitle>
                    <CardDescription>Your dormitory assignment and application status</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Assigned Room</Label>
                        <p className="font-medium mt-1">
                          {profile.assignedRoom ? `Room ${profile.assignedRoom}` : "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <Label>Building</Label>
                        <p className="font-medium mt-1">
                          {profile.assignedBuilding || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <Label>Application Status</Label>
                        <div className="mt-1">
                          {profile.roomApplicationStatus ? (
                            <Badge className={`${
                              profile.roomApplicationStatus === "approved" ? "bg-success" : 
                              profile.roomApplicationStatus === "pending" ? "bg-secondary text-black" :
                              profile.roomApplicationStatus === "cancelled" ? "bg-warning" :
                              "bg-destructive"
                            } text-white`}>
                              {profile.roomApplicationStatus.charAt(0).toUpperCase() + profile.roomApplicationStatus.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-gray-500">No active application</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Application Details</Label>
                        <div className="mt-1">
                          {profile.roomApplicationId ? (
                            <Button 
                              variant="outline"
                              size="sm"
                              className="border-secondary/20 text-primary hover:bg-secondary/10"
                              asChild
                            >
                              <Link href={`/student/reservations/view/${profile.roomApplicationId}`}>
                                View Application
                              </Link>
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-secondary/20 text-primary hover:bg-secondary/10"
                              asChild
                            >
                              <Link href="/student/book">
                                Apply for Housing
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20">
                  <CardHeader className="border-b border-secondary/20">
                    <CardTitle className="text-primary">RFID Card Management</CardTitle>
                    <CardDescription>Manage your RFID card for room access</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between p-4 border border-secondary/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">RFID Card: {profile.rfidCard || "Not assigned"}</p>
                          <p className="text-sm text-gray-600">Status: {profile.rfidCard ? "Active" : "Not assigned"}</p>
                        </div>
                      </div>
                      <Badge className={`${profile.rfidCard ? "bg-success" : "bg-muted"} text-white`}>
                        {profile.rfidCard ? "Active" : "None"}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="outline"
                        className="w-full border-secondary/20 text-primary hover:bg-secondary/10"
                      >
                        Request New Card
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-secondary/20 text-primary hover:bg-secondary/10"
                      >
                        Report Lost Card
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card className="border-secondary/20">
                  <CardHeader className="border-b border-secondary/20">
                    <CardTitle className="text-primary">Security Settings</CardTitle>
                    <CardDescription>Manage your account security and password</CardDescription>
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  )
}
