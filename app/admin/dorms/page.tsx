"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Building, Search, Plus, Edit, Trash2, Users, MapPin, Home } from "lucide-react"
import { 
  getDorms, 
  getUsers,
  Dorm,
  User,
  deleteDorm,
  getDormById
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
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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
import Link from "next/link"
import Image from "next/image"

export default function DormManagement() {
  const router = useRouter()
  // State variables
  const [dorms, setDorms] = useState<Dorm[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Delete dorm state
  const [deleteDormId, setDeleteDormId] = useState<string | null>(null)
  const [deleteDormName, setDeleteDormName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchDorms()
    fetchManagers()
  }, [])

  // Fetch dorms from Firestore
  const fetchDorms = async () => {
    setLoading(true)
    try {
      const dormData = await getDorms()
      setDorms(dormData)
    } catch (error) {
      console.error("Error fetching dorms:", error)
      toast.error("Failed to fetch dorms")
    } finally {
      setLoading(false)
    }
  }

  // Fetch managers for assignment
  const fetchManagers = async () => {
    try {
      const userData = await getUsers()
      // Filter only manager users
      const managerUsers = userData.filter(user => user.role === 'manager')
      setManagers(managerUsers)
    } catch (error) {
      console.error("Error fetching managers:", error)
    }
  }

  // Filter dorms based on search term
  const filteredDorms = dorms.filter(
    (dorm) =>
      dorm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dorm.location.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle dorm deletion confirmation
  const confirmDeleteDorm = (id: string, name: string) => {
    setDeleteDormId(id)
    setDeleteDormName(name)
    setDeleteDialogOpen(true)
  }

  // Close delete confirmation dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false)
    setDeleteDormId(null)
    setDeleteDormName("")
  }

  // Navigate to dorm detail page
  const viewDormDetails = (dormId: string) => {
    router.push(`/admin/dorms/${dormId}`)
  }

  // Navigate to add rooms page
  const addRoomsToDorm = (dormId: string, dormName: string) => {
    router.push(`/admin/dorms/${dormId}/rooms`)
  }

  // Get manager names for a dorm
  const getDormManagerNames = (managerIds: string[]) => {
    if (!managerIds || managerIds.length === 0) return 'No managers assigned'
    
    const dormManagers = managers.filter(manager => managerIds.includes(manager.id))
    return dormManagers.map(manager => `${manager.firstName} ${manager.lastName}`).join(', ')
  }

  // Default image for dorms without images
  const defaultDormImage = "/placeholder.jpg"

  // Helper function to get variant for status badge
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'emerald';
      case 'maintenance':
        return 'amber';
      case 'inactive':
        return 'rose';
      default:
        return 'default';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Dorm Management</h1>
            <p className="text-gray-600 mt-2">
              Manage dormitories, assign managers, and organize rooms
            </p>
          </div>

          <Button 
            className="bg-primary hover:bg-primary/90 rounded-full px-4 shadow-md"
            onClick={() => router.push('/admin/dorms/new')}
          >
            <Plus className="h-4 w-4 mr-2 text-white" />
            <span className="text-white">Add New Dorm</span>
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="mt-6 max-w-2xl">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search dorms by name or location..."
              className="w-full bg-white pl-10 pr-4 py-6 text-base rounded-xl shadow-sm border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Dorms cards grid */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Building className="h-5 w-5 mr-2 text-primary" />
            Dormitories
            <Badge variant="outline" className="ml-3 rounded-full px-2.5 py-0.5 border-gray-200 text-gray-600 font-normal">
              {filteredDorms.length} {filteredDorms.length === 1 ? 'dorm' : 'dorms'}
            </Badge>
          </h2>
          
          {/* Removed total capacity display since it's now calculated from rooms */}
        </div>
        {loading ? (
          <div className="text-center py-16 px-4">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Loading dormitories</h3>
            <p className="text-gray-500">Please wait while we fetch the dormitory data...</p>
          </div>
        ) : filteredDorms.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            {searchTerm ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No matching dormitories</h3>
                <p className="text-gray-500 mb-4">We couldn't find any dorms matching "{searchTerm}"</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                  className="rounded-full"
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Building className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No dormitories yet</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first dormitory</p>
                <Button 
                  className="bg-primary hover:bg-primary/90 rounded-full"
                  onClick={() => router.push('/admin/dorms/new')}
                >
                  <Plus className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white">Add New Dorm</span>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredDorms.map((dorm) => (
              <Card key={dorm.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 rounded-xl bg-white">
                <div className="relative h-56 w-full">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
                  {dorm.imageUrl ? (
                    <img
                      src={dorm.imageUrl}
                      alt={dorm.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105 duration-700"
                      onError={(e) => {
                        // If image fails to load, use default image
                        e.currentTarget.src = defaultDormImage;
                      }}
                    />
                  ) : (
                    <img
                      src={defaultDormImage}
                      alt={dorm.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105 duration-700"
                    />
                  )}
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <Badge className={`px-3 py-1.5 font-medium rounded-full ${
                    dorm.status === 'active' 
                      ? 'bg-emerald-500 text-white' 
                      : dorm.status === 'maintenance' 
                        ? 'bg-amber-400 text-amber-900' 
                        : 'bg-rose-500 text-white'
                  }`}>
                    {dorm.status}
                  </Badge>
                    {dorm.sex && (
                      <Badge className={`px-3 py-1.5 font-medium rounded-full ${
                        dorm.sex === 'Male' 
                          ? 'bg-blue-500 text-white' 
                          : dorm.sex === 'Female' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-gray-500 text-white'
                      }`}>
                        {dorm.sex}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="absolute bottom-0 left-0 z-20 p-4 w-full">
                    <h3 className="text-white text-2xl font-bold mb-1">{dorm.name}</h3>
                    <div className="flex items-center text-white/90 text-sm mb-1">
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      {dorm.location}
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-5">                  
                  <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
                      <Home className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <span className="text-xs text-gray-500 block leading-none">Rooms</span>
                        <span className="font-semibold text-sm">{dorm.roomCount}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center bg-gray-100 px-3 py-2 rounded-lg">
                      <Users className="h-4 w-4 mr-2 text-primary" />
                      <div>
                        <span className="text-xs text-gray-500 block leading-none">Capacity</span>
                        <span className="font-semibold text-sm">{dorm.capacity}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Managers</p>
                    <p className="text-xs truncate text-gray-700">{getDormManagerNames(dorm.managerIds)}</p>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between pt-0 pb-5 px-5 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                    onClick={() => viewDormDetails(dorm.id)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                    onClick={() => addRoomsToDorm(dorm.id, dorm.name)}
                  >
                    <Building className="h-3.5 w-3.5 mr-1.5" />
                    Rooms
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
                    onClick={() => confirmDeleteDorm(dorm.id, dorm.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md rounded-xl">
          <AlertDialogHeader>
            <div className="mx-auto flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-red-50 mb-4">
              <Trash2 className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Delete Dormitory</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete <span className="font-semibold text-black">{deleteDormName}</span>?
              <br/>This action cannot be undone.
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <p className="font-medium flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Warning
                </p>
                <p>Dorms with rooms cannot be deleted. Please delete all rooms first.</p>
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
              onClick={async () => {
                if (!deleteDormId) return;
                
                try {
                  setIsDeleting(true);
                  
                  // Get dorm details before deletion to log manager IDs
                  const dormToDelete = await getDormById(deleteDormId);
                  if (dormToDelete && dormToDelete.managerIds && dormToDelete.managerIds.length > 0) {
                    console.log(`Removing dormId ${deleteDormId} from managers:`, dormToDelete.managerIds);
                  }
                  
                  // Import the deleteDorm function if not already imported
                  const success = await deleteDorm(deleteDormId);
                  
                  if (success) {
                    toast.success(`Dormitory "${deleteDormName}" deleted successfully`);
                    console.log(`Dormitory "${deleteDormName}" (ID: ${deleteDormId}) deleted successfully`);
                    // Refresh the dorms list
                    fetchDorms();
                  } else {
                    throw new Error(`Failed to delete dormitory "${deleteDormName}"`);
                  }
                } catch (error: any) {
                  console.error("Error deleting dormitory:", error);
                  toast.error(error.message || `Failed to delete dormitory "${deleteDormName}"`);
                } finally {
                  setIsDeleting(false);
                  closeDeleteDialog();
                }
              }}
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
              ) : "Delete Dormitory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 