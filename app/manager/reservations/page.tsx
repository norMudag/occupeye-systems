"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, Search, X } from "lucide-react"
import Navigation from "@/components/navigation"
import { 
  getAllReservations,
  getAllDormitories,
  getAllSemesters,
  Reservation
} from "@/app/utils/manager-firestore"
import { auth } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'

export default function ManagerReservations() {
  const [user] = useAuthState(auth)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [buildingFilter, setBuildingFilter] = useState("all")
  const [semesterFilter, setSemesterFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [dormitories, setDormitories] = useState<string[]>([])
  const [semesters, setSemesters] = useState<string[]>([])
  const [isFilterDataLoading, setIsFilterDataLoading] = useState(true)

  useEffect(() => {
    fetchFilterData()
  }, [])
  
  useEffect(() => {
    console.log("Filters changed, refreshing data with:", { statusFilter, buildingFilter, semesterFilter });
    fetchReservations()
  }, [statusFilter, buildingFilter, semesterFilter])
  
  const fetchFilterData = async () => {
    setIsFilterDataLoading(true)
    try {
      // Fetch dormitories
      const dormitoriesData = await getAllDormitories()
      setDormitories(dormitoriesData)
      
      // Fetch semesters
      const semestersData = await getAllSemesters()
      setSemesters(semestersData)
      
      // Initial data fetch
      fetchReservations()
    } catch (error) {
      console.error("Error fetching filter data:", error)
    } finally {
      setIsFilterDataLoading(false)
    }
  }

  const fetchReservations = async () => {
    setIsLoading(true)
    try {
      console.log("Fetching housing applications with filters:", { 
        status: statusFilter, 
        semester: semesterFilter !== "all" ? semesterFilter : undefined,
        building: buildingFilter !== "all" ? buildingFilter : undefined
      });
      
      // First fetching ALL applications without filters to check if data exists
      console.log("First fetching ALL applications without filters to check if data exists...");
      const allData = await getAllReservations();
      console.log(`Retrieved ${allData.length} TOTAL housing applications in database`);
      
      if (allData.length === 0) {
        console.warn("No applications found in the database at all - this may indicate a Firestore connection issue");
        setReservations([]);
        return;
      }
      
      // Now fetch with filters
      const data = await getAllReservations(
        statusFilter as any, 
        semesterFilter !== "all" ? semesterFilter : undefined,
        buildingFilter !== "all" ? buildingFilter : undefined
      )
      
      console.log(`Retrieved ${data.length} filtered housing applications`);
      if (data.length > 0) {
        console.log("Sample application data:", data[0]);
      } else {
        console.log("No data returned after applying filters");
      }
      setReservations(data)
    } catch (error) {
      console.error("Error fetching housing applications:", error)
      setReservations([])
    } finally {
      setIsLoading(false)
    }
  }

  const clearFilters = () => {
    console.log("Clearing all filters");
    setStatusFilter("all")
    setBuildingFilter("all")
    setSemesterFilter("all")
    setSearchTerm("")
  }

  const handleStatusFilterChange = (value: string) => {
    console.log(`Changing status filter to: ${value}`);
    setStatusFilter(value);
  }
  
  const handleSemesterFilterChange = (value: string) => {
    console.log(`Changing semester filter to: ${value}`);
    setSemesterFilter(value);
  }
  
  const handleBuildingFilterChange = (value: string) => {
    console.log(`Changing building filter to: ${value}`);
    setBuildingFilter(value);
  }

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      !searchTerm ||
      (reservation.student || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.studentId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reservation.room || '').toLowerCase().includes(searchTerm.toLowerCase())
      
    return matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-white">Approved</Badge>
      case "denied":
        return <Badge className="bg-destructive text-white">Denied</Badge>
      case "pending":
        return <Badge className="bg-warning text-white">Pending</Badge>
      default:
        return <Badge className="bg-secondary text-black">Unknown</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Housing Applications</h1>
          <p className="text-gray-600 mt-2">View and manage all dormitory applications</p>
        </div>

        <Card className="border-secondary/20 mb-6">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Application Filters</CardTitle>
            <CardDescription>Filter applications by status, semester, or dormitory</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Select value={semesterFilter} onValueChange={handleSemesterFilterChange} disabled={isFilterDataLoading}>
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder={isFilterDataLoading ? "Loading semesters..." : "Filter by semester"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map((semester) => (
                      <SelectItem key={semester} value={semester}>{semester}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <Select value={buildingFilter} onValueChange={handleBuildingFilterChange} disabled={isFilterDataLoading}>
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder={isFilterDataLoading ? "Loading dormitories..." : "Filter by dormitory"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dormitories</SelectItem>
                    {dormitories.map((dormitory, index) => (
                      <SelectItem 
                        key={`dormitory-${index}-${dormitory}`} 
                        value={dormitory}
                      >
                        {dormitory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="border-secondary/20"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
            
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by student name, ID or dormitory room..."
                className="pl-10 border-secondary/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">All Housing Applications</CardTitle>
            <CardDescription>
              {filteredReservations.length} application(s) found
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading housing applications...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-primary mb-2">No applications found</h3>
                <p className="text-gray-600">Try changing your filters or search criteria.</p>
              </div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/20">
                      <TableHead>Student</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((reservation) => (
                      <TableRow key={reservation.id} className="border-secondary/20">
                        <TableCell>
                          <div>
                            <div className="font-medium">{reservation.student}</div>
                            <div className="text-sm text-gray-600">{reservation.studentId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{reservation.room}</div>
                            <div className="text-sm text-gray-600">{reservation.building}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{reservation.semester || 'Current Semester'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={reservation.purpose}>
                            {reservation.purpose}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(reservation.status || '')}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {reservation.requestDate}
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
      </main>
    </div>
  )
} 