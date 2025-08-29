"use client"

import { useState, useEffect } from "react"
import { getUserById } from "@/app/utils/admin-firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Calendar, MapPin, School, CreditCard, BookOpen, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface TenantProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
}

export default function TenantProfileModal({ open, onOpenChange, userId }: TenantProfileModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchTenantData = async () => {
      if (!userId) return
      
      setIsLoading(true)
      setError(null)
      
      try {
        const userData = await getUserById(userId)
        if (userData) {
          setTenant(userData)
        } else {
          setError("Tenant information not found")
        }
      } catch (error) {
        console.error("Error fetching tenant data:", error)
        setError("Failed to load tenant information")
      } finally {
        setIsLoading(false)
      }
    }
    
    if (open && userId) {
      fetchTenantData()
    }
  }, [open, userId])

  const joinDate =  tenant?.createdAt ? new Date (tenant.createdAt).toLocaleDateString("en-US",{
    year:"numeric", month:"long", day:"numeric" }):null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-primary">Tenant Profile</DialogTitle>
          <DialogDescription>
            Resident information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className="h-8 w-8 rounded-full border-3 border-primary border-t-transparent animate-spin"></div>
            <p className="ml-3 text-gray-600 text-sm">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-destructive">{error}</p>
          </div>
        ) : tenant ? (
          <div className="py-2">
            {/* Basic Info - Compact Header */}
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16 border-2 border-secondary">
                <AvatarImage 
                  src={tenant.profileImageUrl || "/placeholder-user.jpg"} 
                  alt={`${tenant.firstName} ${tenant.lastName}`} 
                />
                <AvatarFallback className="bg-secondary text-black text-lg">
                  {tenant.firstName?.[0]}{tenant.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-semibold">
                  {tenant.firstName} {tenant.lastName}
                </h2>
                <p className="text-gray-600 text-sm">{tenant.studentId || "No Student ID"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-secondary text-black text-xs">
                    {tenant.academicStatus || "Not specified"}
                  </Badge>
                  <Badge className={
                    tenant.status === "entry"
                      ? "bg-success text-white text-xs"
                      : tenant.status === "exit"
                      ? "bg-warning text-white text-xs"
                      : "bg-primary text-white text-xs"
                  }>
                    {tenant.status?.charAt(0).toUpperCase() + tenant.status?.slice(1) || "Unknown"}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Contact Info */}
            <div className="flex flex-col space-y-1 mb-4 text-xs">
              <div className="flex items-center">
                <Mail className="h-3.5 w-3.5 text-primary mr-2" />
                <span className="text-gray-600">{tenant.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-3.5 w-3.5 text-primary mr-2" />
                <span className="text-gray-600">{tenant.contactNumber || "No phone number"}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 text-primary mr-2" />
               <span className="text-gray-600">
              Joined: {joinDate}</span>
              </div>
            </div>
            
            {/* Information Cards */}
            <div className="space-y-3">
              {/* Personal Information */}
              <Card className="border-secondary/20">
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <User className="h-3.5 w-3.5 mr-1" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Date of Birth</span>
                      <p className="font-medium">{tenant.dateOfBirth || "Not provided"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Emergency Contact</span>
                      <p className="font-medium">{tenant.emergencyContact || "Not provided"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Address</span>
                      <p className="font-medium">{tenant.address || "Not provided"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Academic Details */}
              <Card className="border-secondary/20">
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <School className="h-3.5 w-3.5 mr-1" />
                    Academic Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Course</span>
                      <p className="font-medium">{tenant.course || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Year Level</span>
                      <p className="font-medium">{tenant.yearLevel || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Academic Status</span>
                      <p className="font-medium">{tenant.academicStatus || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">RFID Card</span>
                      <p className="font-medium">{tenant.rfidCard || "Not assigned"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Housing Information */}
              <Card className="border-secondary/20">
                <CardContent className="p-3">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <MapPin className="h-3.5 w-3.5 mr-1" />
                    Housing Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Assigned Building</span>
                      <p className="font-medium">{tenant.assignedBuilding || "Not assigned"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Assigned Room</span>
                      <p className="font-medium">{tenant.assignedRoom || "Not assigned"}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Application Status</span>
                      {tenant.roomApplicationStatus 
                        ? <div className="mt-1">
                            <Badge variant={tenant.roomApplicationStatus === "approved" ? "success" : tenant.roomApplicationStatus === "pending" ? "warning" : "destructive"} className="text-xs">
                              {tenant.roomApplicationStatus.charAt(0).toUpperCase() + tenant.roomApplicationStatus.slice(1)}
                            </Badge>
                          </div>
                        : <p className="font-medium">No application</p>
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-600">No tenant information available</p>
          </div>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            className="border-secondary/20"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 