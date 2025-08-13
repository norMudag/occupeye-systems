"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Users, AlertCircle, Building, ArrowRight, Info } from "lucide-react"
import Navigation from "@/components/navigation"
import Link from "next/link"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import { getDorms, Dorm, getUserById } from "@/app/utils/admin-firestore"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { doc, getDoc } from "firebase/firestore"

// Define interface for user sex type
interface UserData {
  sex?: string;
  roomApplicationStatus?: string;
  roomApplicationId?: string;
  assignedRoom?: string;
}

export default function ApplyForDormitory() {
  const [user] = useAuthState(auth)
  const [searchTerm, setSearchTerm] = useState("")
  const [dormitories, setDormitories] = useState<Dorm[]>([])
  const [loading, setLoading] = useState(true)
  const [hasApprovedApplication, setHasApprovedApplication] = useState(false)
  const [approvedRoom, setApprovedRoom] = useState<string | null>(null)
  const [userSex, setUserSex] = useState<string | null>(null)
  const [showingFilteredDorms, setShowingFilteredDorms] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Check if user has an approved application and get user sex
        if (user) {
          // Get user data directly from Firestore to ensure we have the sex field
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            
            // Check for approved application
            if (userData.roomApplicationStatus === 'approved' && userData.roomApplicationId) {
              setHasApprovedApplication(true);
              setApprovedRoom(userData.assignedRoom || 'your room');
            }
            
            // Get user sex for filtering
            if (userData.sex) {
              setUserSex(userData.sex);
              console.log("User sex:", userData.sex); // Debug log
            }
          }
        }

        // Fetch available dormitories
        const dormitoriesData = await getDorms();
        setDormitories(dormitoriesData);
        console.log("Dormitories:", dormitoriesData); // Debug log
      } catch (error) {
        console.error("Error fetching dormitories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter dormitories based on search term and user sex
  const filteredDormitories = dormitories.filter((dorm) => {
    const matchesSearch = dorm.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         dorm.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If userSex is available, filter by dormitory sex type
    if (userSex) {
      // Check if dorm has sex field defined
      if (dorm.sex) {
        // Only show dorms that match user's sex or are Mixed
        const sexMatches = dorm.sex === userSex || dorm.sex === 'Mixed';
        console.log(`Dorm: ${dorm.name}, Dorm sex: ${dorm.sex}, User sex: ${userSex}, Matches: ${sexMatches}`);
        return matchesSearch && sexMatches;
      } else {
        // For dorms without a sex specified, show them to everyone (treat as mixed)
        console.log(`Dorm: ${dorm.name}, Dorm sex: undefined/null, User sex: ${userSex}, Showing to all`);
        return matchesSearch;
      }
    }
    
    return matchesSearch;
  });

  // Add function to determine if we should show a sex badge for dormitories
  const getSexBadgeColor = (dormSex: string | null | undefined) => {
    if (!dormSex) return null; // Don't show badge if no sex specified
    
    switch(dormSex) {
      case 'Male': return 'bg-blue-500';
      case 'Female': return 'bg-pink-500';
      case 'Mixed': return 'bg-gray-500';
      default: return null;
    }
  };

  // Set flag when filtering is active
  useEffect(() => {
    setShowingFilteredDorms(userSex !== null);
  }, [userSex]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">Dormitories</h1>
          <p className="text-gray-600 mt-1">Find and apply for available dormitory rooms</p>
        </div>

        {hasApprovedApplication && (
          <Alert className="mb-8 border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700">Already Approved</AlertTitle>
            <AlertDescription className="text-amber-700">
              You already have an approved room application for {approvedRoom}. You cannot apply for additional rooms.
            </AlertDescription>
          </Alert>
        )}

  

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search dormitories by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-gray-200"
          />
        </div>

        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-medium">Available Dormitories</h2>
          <p className="text-sm text-gray-500">{filteredDormitories.length} buildings found</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Loading dormitories</h3>
            <p className="text-gray-500">Please wait while we fetch the dormitory data...</p>
          </div>
        ) : filteredDormitories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDormitories.map((dorm, index) => (
              <Card key={index} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                <div className="relative">
                  {/* Dorm image/profile */}
                  <div className="h-48 bg-gray-200 relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    {dorm.imageUrl ? (
                      <img 
                        src={dorm.imageUrl} 
                        alt={dorm.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-300">
                        <Building className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Status badge */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge className={`${dorm.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'} text-white px-3 py-1 rounded-full text-xs font-medium`}>
                        {dorm.status}
                      </Badge>
                      
                      {/* Sex badge */}
                      {dorm.sex && (
                        <Badge className={`${
                          getSexBadgeColor(dorm.sex)
                        } text-white px-3 py-1 rounded-full text-xs font-medium`}>
                          {dorm.sex}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Name and location */}
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="text-xl font-bold">{dorm.name}</h3>
                      <div className="flex items-center mt-1 text-gray-200">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{dorm.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex border-t border-gray-200">
                    <div className="flex-1 p-4 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className="mr-2">
                          <p className="text-sm text-gray-500">Rooms</p>
                          <p className="font-bold text-lg">{dorm.roomCount || 0}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 p-4">
                      <div className="flex items-center">
                        <div className="mr-2">
                          <p className="text-sm text-gray-500">Capacity</p>
                          <p className="font-bold text-lg">{dorm.capacity || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Managers section */}
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Managers</p>
                    <p className="text-sm text-gray-700 mt-1">
                      {dorm.managerIds && dorm.managerIds.length > 0 ? 
                        `${dorm.managerIds.length} manager${dorm.managerIds.length > 1 ? 's' : ''} assigned` : 
                        'No managers assigned'}
                    </p>
                  </div>
                  
                  {/* View rooms button */}
                  <div className="px-4 pb-4 pt-2">
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                      asChild
                    >
                      <Link href={`/student/book/reserve/${dorm.id}`}>
                        Apply
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No dormitories found</h3>
            <p className="text-gray-600 mb-4">Try changing your search criteria.</p>
          </div>
        )}
      </main>
    </div>
  )
}
