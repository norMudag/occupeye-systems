"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, MapPin, Users, Calendar, Clock, Building } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { createReservation, getAcademicYears } from "@/app/utils/student-firestore"
import { getUserById, Room, Dorm, getDormById } from "@/app/utils/admin-firestore"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function ApplyForDormRoom() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [user] = useAuthState(auth)
  
  const dormId = params?.id ? params.id as string : ""
  const [dorm, setDorm] = useState<Dorm | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingDorm, setLoadingDorm] = useState(true)
  const [academicYears, setAcademicYears] = useState<string[]>([])

  const [application, setApplication] = useState({
    semester: "",
    academicYear: "",
    purpose: "",
    notes: "",
    corFile: "", // Add new state for COR file path
  })
  
  useEffect(() => {
    const fetchDorm = async () => {
      try {
        setLoadingDorm(true)
        
        // First check if the user already has an approved room application
        if (user) {
          const userData = await getUserById(user.uid)
          if (userData && userData.roomApplicationStatus === 'approved' && userData.roomApplicationId) {
            toast({
              title: "Already Approved",
              description: "You already have an approved room application and cannot apply for additional rooms.",
              variant: "destructive"
            })
            router.push("/student/book")
            return
          }
        }
        
        const dormData = await getDormById(dormId)
        if (!dormData) {
          toast({
            title: "Error",
            description: "Dormitory not found",
            variant: "destructive"
          })
          router.push("/student/book")
          return
        }
        
        if (dormData.status !== "vacant") {
          toast({
            title: "Dormitory Unavailable",
            description: "This dormitory is not currently accepting applications",
            variant: "destructive"
          })
          router.push("/student/book")
          return
        }
        
        setDorm(dormData)
      } catch (error) {
        console.error("Error fetching dormitory:", error)
        toast({
          title: "Error",
          description: "Failed to load dormitory details",
          variant: "destructive"
        })
      } finally {
        setLoadingDorm(false)
      }
    }
    
    if (dormId) {
      fetchDorm()
    }
  }, [dormId, toast, router, user])

  // Get academic years in real-time
  useEffect(() => {
    const unsubscribe = getAcademicYears((years) => {
      setAcademicYears(years)
      
      // Set default to current academic year if it exists in the list
      if (years.length > 0 && !application.academicYear) {
        // We'll select the second year in the list which is the current year
        const currentYear = years[1] || years[0]; 
        setApplication(prev => ({ ...prev, academicYear: currentYear }))
      }
    })
    
    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !dorm || !application.corFile) {
      toast({
        title: "Missing Requirements",
        description: "Please upload your Certificate of Registration",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true)

    try {
      // Fetch the user's full name from Firestore
      const userData = await getUserById(user.uid)
      
      // Use a fallback name if user data doesn't exist in Firestore
      const fullName = userData 
        ? `${userData.firstName} ${userData.lastName}`.trim() 
        : (user.displayName || user.email || "Unknown User")
        
      // Create the reservation data for semester, combining semester and academic year
      const fullSemester = `${application.semester} ${application.academicYear}`;
      
      const applicationData = {
        room: "", // Room will be assigned by manager
        roomName: "", // Room name will be assigned by manager
        building: dorm.name,
        dormId: dorm.id, // Store the dormitory ID
        semester: fullSemester, // Combine semester and academic year
        status: "pending", // Initial status is pending
        purpose: application.purpose,
        userId: user.uid,
        attendees: 1, // Fixed to 1 student per application
        notes: application.notes || "",
        fullName, // Add full name to reservation
        corFile: application.corFile || "", 
      }
      console.log("APPLICATION DATA" ,applicationData)
      
      // Save to Firestore
      const applicationId = await createReservation(applicationData)
      
      if (applicationId) {
        toast({
          title: "Application Submitted",
          description: "Your dormitory application has been submitted successfully and is pending approval",
        })
        router.push("/student/reservations")
      } else {
        throw new Error("Failed to submit application")
      }
    } catch (error) {
      console.error("Error creating application:", error)
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingDorm) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dormitory details...</p>
        </main>
      </div>
    )
  }
  
  if (!dorm) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole="student" />
        <main className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Dormitory not found</h2>
          <p className="mt-2 text-gray-600">The dormitory you're trying to apply for doesn't exist or has been removed.</p>
          <Button className="mt-4" asChild>
            <Link href="/student/book">Back to Dormitory List</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" className="mb-4" asChild>
            <Link href="/student/book">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dormitories
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-primary">Apply for Dormitory Housing</h1>
          <p className="text-gray-600 mt-2">Complete the form below to submit your dormitory housing application</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Dormitory Application Details</CardTitle>
                <CardDescription>Fill in your information for dormitory housing</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester</Label>
                      <Select
                        value={application.semester}
                        onValueChange={(value) => setApplication({...application, semester: value})}
                        required
                      >
                        <SelectTrigger id="semester" className="border-secondary/20">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1st Semester">1st Semester</SelectItem>
                          <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                          <SelectItem value="Summer">Summer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="academicYear">Academic Year</Label>
                      <Select
                        value={application.academicYear}
                        onValueChange={(value) => setApplication({...application, academicYear: value})}
                        required
                      >
                        <SelectTrigger id="academicYear" className="border-secondary/20">
                          <SelectValue placeholder="Select academic year" />
                        </SelectTrigger>
                        <SelectContent>
                          {academicYears.map((year) => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Reason for Application</Label>
                    <Input
                      id="purpose"
                      placeholder="e.g., Exchange Student, New Enrollment, etc."
                      className="border-secondary/20"
                      value={application.purpose}
                      onChange={(e) => setApplication({...application, purpose: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requirements or additional information"
                      className="border-secondary/20 min-h-[100px]"
                      value={application.notes}
                      onChange={(e) => setApplication({...application, notes: e.target.value})}
                    />
                  </div>
                 {/* Certificate of Registration Upload Field */}
               <Input
                id="cor"
                type="file"
                accept=".pdf"  // ✅ only pdf allowed
                className="border-secondary/20"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("directory", "uploads/cor"); // ✅ custom folder

                    try {
                      const res = await fetch("/api/upload", {
                        method: "POST",
                        body: formData,
                      });

                      if (!res.ok) throw new Error("Upload failed");

                      const data = await res.json();
                      setApplication({ ...application, corFile: data.path }); // save path for Firestore
                    } catch (error) {
                      console.error("Upload error:", error);
                      toast({
                        title: "Upload Error",
                        description: "Failed to upload COR. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }
                }}
                required
              />
              <p className="text-sm text-gray-500">
                Please upload your Certificate of Registration (PDF format only)
              </p>
                
                  <div className="pt-4 flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-secondary/20"
                      onClick={() => router.push("/student/book")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></div>
                          Submitting...
                        </>
                      ) : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-secondary/20 sticky top-8">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Dormitory Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold">{dorm.name}</h3>
                    <p className="text-gray-600 flex items-center mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{dorm.location}</span>
                  </p>
                </div>

                  <div className="flex items-center">
                    <Building className="h-4 w-4 text-primary mr-2" />
                    <span>Occupancy: {dorm.occupancyRate}%</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-primary mr-2" />
                    <span>Capacity: {dorm.capacity} students</span>
                </div>

                  <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mt-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Your dormitory application will be sent to the housing administrator for approval. You will receive a notification once it's reviewed.
                  </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
