"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Clock, TrendingUp, Calendar, Users, Building, RefreshCw } from "lucide-react"
import Navigation from "@/components/navigation"
import { getPendingReservations, getRecentReservations, getBuildingsStatus, getManagerDashboardStats, getManagerDashboardStatsByDorm, updateReservationStatus, Reservation, BuildingStatus, getCurrentSemester, getReservationAnalytics, getRFIDActivityData, getPendingReservationsByDorm, getRecentReservationsByDorm, getReservationAnalyticsByDorm, getRFIDActivityDataByDorm } from "@/app/utils/manager-firestore"
import { useAuth } from "@/lib/AuthContext"
import { auth } from "@/lib/firebase"
import { useAuthState } from 'react-firebase-hooks/auth'
import { getUserById, getDormById } from '@/app/utils/admin-firestore'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusDistributionChart, WeeklyTrendChart, RFIDActivityChart } from "@/components/charts/DashboardCharts"

// Define a custom interface for manager user
interface ManagerUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  managedDormId?: string;
  [key: string]: any;
}

export default function ManagerDashboard() {
  const [user] = useAuthState(auth)
  const { userData } = useAuth() as { userData: any }
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([])
  const [roomStatus, setRoomStatus] = useState<BuildingStatus[]>([])
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([])
  const [currentSemester, setCurrentSemester] = useState(getCurrentSemester())
  const [dashboardStats, setDashboardStats] = useState({
    pendingCount: 0,
    semesterReservations: 0,
    semesterApproved: 0,
    semesterPending: 0, 
    overallOccupancy: 0,
    activeStudents: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  // Analytics state
  const [reservationAnalytics, setReservationAnalytics] = useState<{
    weekly: { week: string; count: number }[];
    statusDistribution: { approved: number; pending: number; denied: number };
  }>({
    weekly: [],
    statusDistribution: { approved: 0, pending: 0, denied: 0 }
  })
  

  
  const [rfidTimeRange, setRfidTimeRange] = useState<'today' | 'week' | 'month'>('today')
  const [rfidData, setRfidData] = useState<{
    hours: string[];
    entryData: number[];
    exitData: number[];
    alerts: {
      level: 'high' | 'medium' | 'low';
      type: string;
      location: string;
      time: string;
    }[];
    topTenants: {
      studentId: string;
      studentName: string;
      totalActivity: number;
      entries: number;
      exits: number;
      dormName?: string; // Added dormName to topTenants
      building?: string; // Added building to topTenants
    }[];
  }>({
    hours: [],
    entryData: [],
    exitData: [],
    alerts: [],
    topTenants: []
  })

  // Get dormName of logged in manager
  const [dormName, setDormName] = useState("")
  
  useEffect(() => {
    const getDormName = async () => {
      try {
        // Check if userData has managedDormId
        if (!userData?.managedDormId) return;
        
        // Get dorm data
        const dormData = await getDormById(userData.managedDormId);
        if (dormData) {
          setDormName(dormData.name);
          console.log("Manager's dormitory name:", dormData.name);
        }
      } catch (error) {
        console.error("Error fetching dorm data:", error);
      }
    };
    
    getDormName();
  }, [userData]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Get pending reservations
        console.log("Fetching pending applications...")
        const pendingData = await getPendingReservationsByDorm()
        console.log("Pending applications data:", pendingData)
        setPendingReservations(pendingData)
        
        // Get building status
        const buildingsData = await getBuildingsStatus()
        setRoomStatus(buildingsData)
        
        // Get recent reservations from activity history
        const recentData = await getRecentReservationsByDorm(10) // Increased to 10 for more history
        setRecentReservations(recentData)
        
        // Get dashboard stats for the selected semester using dorm-specific function
        console.log("Fetching dashboard stats for the manager's dormitory...")
        const stats = await getManagerDashboardStatsByDorm()
        console.log("Dashboard stats:", stats)
        setDashboardStats(stats)
        
        // Get reservation analytics
        const reservationData = await getReservationAnalyticsByDorm(currentSemester)
        setReservationAnalytics(reservationData)
        
        // Get RFID activity data - explicitly from rfidLogs collection
        console.log(`Fetching RFID activity data from Firestore rfidLogs collection for ${rfidTimeRange} range...`);
        const rfidActivityData = await getRFIDActivityDataByDorm(rfidTimeRange);
        console.log("RFID data from Firestore rfidLogs collection:", rfidActivityData);
        setRfidData(rfidActivityData)
        
        // Set last updated timestamp
        setLastUpdated(new Date())
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        // Set error state or show error message to user
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [currentSemester, rfidTimeRange]) // Re-fetch when semester or RFID time range changes

  // Add useEffect to log top tenants data
  useEffect(() => {
    if (rfidData.topTenants && rfidData.topTenants.length > 0) {
      console.log("Top tenants data:", rfidData.topTenants);
    }
  }, [rfidData.topTenants]);

  const handleApproveReservation = async (id: string) => {
    try {
      if (!user?.uid) return
      
      const success = await updateReservationStatus(id, 'approved', user.uid)
      
      if (success) {
        // Update the local state to remove the approved reservation
        setPendingReservations((prev) => prev.filter((r) => r.id !== id))
        
        // Get updated recent reservations
        const updatedRecentData = await getRecentReservationsByDorm(10)
        setRecentReservations(updatedRecentData)
        
        // Update stats
        setDashboardStats(prev => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          semesterApproved: prev.semesterApproved + 1,
          semesterPending: Math.max(0, prev.semesterPending - 1)
        }))
        
        // Update reservation analytics
        const updatedReservationData = await getReservationAnalyticsByDorm(currentSemester)
        setReservationAnalytics(updatedReservationData)
      }
    } catch (error) {
      console.error("Error approving application:", error)
    }
  }

  const handleDenyReservation = async (id: string) => {
    try {
      if (!user?.uid) return
      
      const success = await updateReservationStatus(id, 'denied', user.uid)
      
      if (success) {
        // Update the local state to remove the denied reservation
        setPendingReservations((prev) => prev.filter((r) => r.id !== id))
        
        // Get updated recent reservations
        const updatedRecentData = await getRecentReservationsByDorm(10)
        setRecentReservations(updatedRecentData)
        
        // Update stats
        setDashboardStats(prev => ({
          ...prev,
          pendingCount: Math.max(0, prev.pendingCount - 1),
          semesterPending: Math.max(0, prev.semesterPending - 1)
        }))
        
        // Update reservation analytics
        const updatedReservationData = await getReservationAnalyticsByDorm(currentSemester)
        setReservationAnalytics(updatedReservationData)
      }
    } catch (error) {
      console.error("Error denying application:", error)
    }
  }
  
  // Handle RFID time range change
  const handleRfidTimeRangeChange = async (value: string) => {
    const timeRange = value as 'today' | 'week' | 'month'
    setRfidTimeRange(timeRange)
    
    try {
      setIsLoading(true)
      const rfidActivityData = await getRFIDActivityDataByDorm(timeRange)
      setRfidData(rfidActivityData)
    } catch (error) {
      console.error("Error fetching RFID data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Add refresh function
  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Get reservation analytics
      const reservationData = await getReservationAnalyticsByDorm(currentSemester);
      setReservationAnalytics(reservationData);
      
      // Get RFID activity data from rfidLogs collection
      console.log(`Refreshing RFID activity data from Firestore rfidLogs collection for ${rfidTimeRange} range...`);
      const rfidActivityData = await getRFIDActivityDataByDorm(rfidTimeRange);
      setRfidData(rfidActivityData);
      
      // Update dashboard stats using dorm-specific function
      console.log("Refreshing dashboard stats for the manager's dormitory...");
      const stats = await getManagerDashboardStatsByDorm();
      console.log("Updated dashboard stats:", stats);
      setDashboardStats(stats);
      
      // Set last updated timestamp
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format the last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    
    return lastUpdated.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Manager Dormitory Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage applications and monitor occupancy in your assigned dormitory</p>
          </div>
          <div className="flex items-center gap-4">
            {!isLoading && lastUpdated && (
              <div className="text-xs text-muted-foreground text-right">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
                  <span>Live Dormitory Data</span>
                </div>
                <div className="mt-1">Last updated: {formatLastUpdated()}</div>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isLoading}
              className="border-secondary/20 flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Pending Applications</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{dashboardStats.pendingCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting application in this dormitory</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Current Term</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.semesterReservations}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.semesterApproved} approved, {dashboardStats.semesterPending} pending
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentSemester} • MSU
              </p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Overall Occupancy</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.overallOccupancy}%</div>
              <Progress 
                value={dashboardStats.overallOccupancy} 
                className={`h-2 mt-2 ${
                  dashboardStats.overallOccupancy > 90 
                    ? "bg-muted [&>div]:bg-warning" 
                    : dashboardStats.overallOccupancy > 70 
                      ? "bg-muted [&>div]:bg-primary" 
                      : "bg-muted [&>div]:bg-success"
                }`}
              />
              <p className="text-xs text-muted-foreground mt-2">Based on room occupants in your dormitory</p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Resident Students</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">Currently residents in your dormitory</p>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardStats.activeStudents > 0 ? `` : 'No residents found'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-primary">Reservation Analytics</CardTitle>
                    <CardDescription>Understand student interaction with the reservation system</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    {!isLoading && reservationAnalytics.weekly.length > 0 && (
                      <div className="text-xs text-success flex items-center">
                        <div className="w-2 h-2 rounded-full bg-success mr-1"></div>
                      
                      </div>
                    )}
                    <Select defaultValue={currentSemester} onValueChange={(value) => setCurrentSemester(value)}>
                      <SelectTrigger className="w-[200px] border-secondary/20">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={getCurrentSemester()}>{getCurrentSemester()}</SelectItem>
                        <SelectItem value="1st Semester 2025-2026">1st Semester 2025-2026</SelectItem>
                        <SelectItem value="2nd Semester 2025-2026">2nd Semester 2025-2026</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reservation analytics...</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {reservationAnalytics.weekly.length === 0 || (reservationAnalytics.statusDistribution.approved === 0 && reservationAnalytics.statusDistribution.pending === 0 && reservationAnalytics.statusDistribution.denied === 0) ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No reservation data available for this semester</p>
                        <p className="text-xs text-muted-foreground mt-2">Try selecting a different semester or refreshing the data</p>
                        <div className="mt-4 text-left max-w-md mx-auto bg-muted/20 p-4 rounded text-xs">
                          <p className="font-medium mb-2">To see data here, ensure you have:</p>
                          <ol className="list-decimal pl-4 space-y-1">
                            <li>Reservations in the reservations collection with the selected semester</li>
                            <li>Reservations with status values (approved, pending, denied)</li>
                            <li>Reservations with proper timestamp data</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Reservation Status Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Reservation Status Distribution */}
                          <Card className="border-secondary/20">
                            <CardHeader className="py-2 px-4 border-b border-secondary/20">
                              <CardTitle className="text-sm font-medium">Reservation Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 h-[250px] flex items-center justify-center">
                              <StatusDistributionChart data={reservationAnalytics.statusDistribution} />
                            </CardContent>
                          </Card>

                          {/* Reservation Processing Time */}
                          <Card className="border-secondary/20">
                            <CardHeader className="py-2 px-4 border-b border-secondary/20">
                              <CardTitle className="text-sm font-medium">Recent Application Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="space-y-4 max-h-[250px] overflow-y-auto">
                                {recentReservations.slice(0, 5).map((reservation) => (
                                  <div key={reservation.id} className="flex items-center justify-between border-b border-secondary/10 pb-2">
                                    <div>
                                      <div className="font-medium text-sm">{reservation.fullName || reservation.student}</div>
                                      <div className="text-xs text-muted-foreground">{reservation.room} • {reservation.requestDate}</div>
                                    </div>
                                    <Badge
                                      className={
                                        reservation.status === "approved" ? "bg-success text-white" : "bg-warning text-white"
                                      }
                                    >
                                      {reservation.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Reservation Trends */}
                        <Card className="border-secondary/20">
                          <CardHeader className="py-2 px-4 border-b border-secondary/20">
                            <CardTitle className="text-sm font-medium">Reservation Trend (Weekly)</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 h-[200px]">
                            <WeeklyTrendChart data={reservationAnalytics.weekly} />
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
      </main>
    </div>
  )
}
