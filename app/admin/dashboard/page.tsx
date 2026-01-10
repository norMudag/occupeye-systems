"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Users, Building, Activity, Shield, Search, Plus, Edit, Trash2, Settings, X, RefreshCw } from "lucide-react"
import { getUsers, getRooms, getRfidLogs, getDashboardStats, User, Room as AdminRoom, RfidLog, DashboardStats, getRfidActivityData } from "@/app/utils/admin-firestore"
import { StatusDistributionChart, RFIDActivityChart } from "@/components/charts/DashboardCharts"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import RegistrationModal from '@/components/admin-components/registrationModal'
import EditUserModal from "@/components/admin-components/editUserModal"
import DeleteUserModal from "@/components/admin-components/deleteUserModal"
import {DashboardStatsCard} from "@/components/admin-components/card/dashboardStats"

// Room form type
interface RoomForm {
  name: string;
  building: string;
  capacity: number;
  status: string;
  rfidEnabled: boolean;
}

export default function AdminDashboard() {
  // State variables
    const [showRegisterModal, setShowRegisterModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [users, setUsers] = useState<User[]>([])
  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [rfidLogs, setRfidLogs] = useState<RfidLog[]>([])
  const [rfidTimeRange, setRfidTimeRange] = useState<'today' | 'week' | 'month'>('today')
  const [rfidActivityData, setRfidActivityData] = useState<{
    hours: string[];
    entryData: number[];
    exitData: number[];
  }>({
    hours: [],
    entryData: [],
    exitData: []
  })
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    studentCount: 0,
    staffCount: 0,
    totalRooms: 0,
    maintenanceRooms: 0,
    activeRooms: 0,
    rfidEventsToday: 0,
    entriesCount: 0,
    exitsCount: 0,
    systemStatus: 'Loading'
  })
  const [loading, setLoading] = useState(true)
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [rfidActionFilter, setRfidActionFilter] = useState('all')

  // Room creation modal state
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomForm, setRoomForm] = useState<RoomForm>({
    name: '',
    building: '',
    capacity: 1,
    status: 'available',
    rfidEnabled: false
  })

  // User edit modal state
  const [editUserForm, setEditUserForm] = useState<User | null>(null)
  // User delete confirmation

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Get dashboard stats
        const dashboardStats = await getDashboardStats()
        setStats(dashboardStats)
        
        // Get all users
        const allUsers = await getUsers()
        setUsers(allUsers)

        // Get all rooms
        const allRooms = await getRooms()
        setRooms(allRooms)

        // Get RFID logs
        const logs = await getRfidLogs({ limit: 10 })
        setRfidLogs(logs)

        // Get RFID activity data for chart
        const activityData = await getRfidActivityData(rfidTimeRange)
        setRfidActivityData(activityData)
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [rfidTimeRange])

  // Handle filtering users by role
  const handleRoleFilter = async (role: string) => {
    setUserRoleFilter(role)
    try {
      const filteredUsers = await getUsers(role)
      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error filtering users:", error)
    }
  }

  
  // Open edit user modal
  const openEditUserModal = (user: User) => {
    setEditUserForm(user)
    setShowEditModal(true)
  }

  // Handle filtering RFID logs by action
  const handleActionFilter = async (action: string) => {
    setRfidActionFilter(action)
    try {
      const filteredLogs = await getRfidLogs(
        action === 'all' ? { limit: 10 } : { action, limit: 10 }
      )
      setRfidLogs(filteredLogs)
    } catch (error) {
      console.error("Error filtering RFID logs:", error)
    }
  }

  // Handle user search
  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      const allUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      setUsers(allUsers)
      return
    }

    try {
      // Note: This is a client-side filter. For a production app,
      // you would implement server-side search in Firestore
      const allUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      const filteredUsers = allUsers.filter(user =>
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        (user.studentId && user.studentId.toLowerCase().includes(query.toLowerCase()))
      )
      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error searching users:", error)
    }
  }

  // Handle RFID log search
  const handleLogSearch = async (query: string) => {
    if (!query.trim()) {
      const logs = await getRfidLogs(
        rfidActionFilter === 'all' ? { limit: 10 } : { action: rfidActionFilter, limit: 10 }
      )
      setRfidLogs(logs)
      return
    }

    try {
      // Note: This is a client-side filter. For a production app,
      // you would implement server-side search in Firestore
      const allLogs = await getRfidLogs(
        rfidActionFilter === 'all' ? { limit: 50 } : { action: rfidActionFilter, limit: 50 }
      )
      const filteredLogs = allLogs.filter(log =>
        log.studentId.toLowerCase().includes(query.toLowerCase()) ||
        log.studentName.toLowerCase().includes(query.toLowerCase()) ||
        log.room.toLowerCase().includes(query.toLowerCase())
      )
      setRfidLogs(filteredLogs.slice(0, 10)) // Limit to 10 results
    } catch (error) {
      console.error("Error searching logs:", error)
    }
  }



  // Handle RFID time range change
  const handleRfidTimeRangeChange = async (value: 'today' | 'week' | 'month') => {
    setRfidTimeRange(value)
  }

  // If loading, show loading spinner
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-gray-600 text-xs">System administration and user management</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
            <DashboardStatsCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.studentCount} students, ${stats.staffCount} staff`}
          icon={Users}
        />
             <DashboardStatsCard
          title="  Room Status"
          value={stats.totalRooms}
          subtitle={`${stats.maintenanceRooms} maintenance, , ${stats.activeRooms} active`}
          icon={Building}
        />

             <DashboardStatsCard
          title="RFID Events Today"
          value={stats.rfidEventsToday}
          subtitle={`${stats.entriesCount} entries, ${stats.exitsCount} exits`}
          icon={Activity}
        />
        {/* System Health */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center">
              <Shield className="h-4 w-4 mr-2 text-primary" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Optimal</div>
            <p className="text-xs text-gray-500">All systems operational</p>
          </CardContent>
        </Card>

      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="reservation-analytics" className="space-y-3">
        <TabsList className="h-9">
          <TabsTrigger value="reservation-analytics" className="text-xs h-8">Reservation Analytics</TabsTrigger>
          <TabsTrigger value="rfid-analytics" className="text-xs h-8">Student Check-in/Check-out Activity</TabsTrigger>
          <TabsTrigger value="user-summary" className="text-xs h-8">User Management Summary</TabsTrigger>
        </TabsList>

        {/* Reservation Activity Tracker Tab */}
        <TabsContent value="reservation-analytics" className="space-y-4">
          <Card className="border-secondary/20">
            <CardHeader className="border-b border-secondary/20 py-3">
              <CardTitle className="text-primary text-base">Reservation Activity Tracker</CardTitle>
              <CardDescription className="text-xs">Monitor reservation patterns and status distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading reservation analytics...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Reservation Status Distribution */}
                    <Card className="border-secondary/20">
                      <CardHeader className="py-2 px-4 border-b border-secondary/20">
                        <CardTitle className="text-sm font-medium">Reservation Status</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 h-[250px]">
                        <StatusDistributionChart
                          data={{
                            approved: stats.entriesCount || 0,
                            pending: stats.exitsCount || 0,
                            denied: stats.maintenanceRooms || 0
                          }}
                        />
                      </CardContent>
                    </Card>

                    {/* Most Reserved Dorms */}
                    <Card className="border-secondary/20">
                      <CardHeader className="py-2 px-4 border-b border-secondary/20">
                        <CardTitle className="text-sm font-medium">Room Availability</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Available', value: stats.activeRooms || 0, fill: '#10b981' },
                              { name: 'Maintenance', value: stats.maintenanceRooms || 0, fill: '#f59e0b' },
                              { name: 'Occupied', value: (stats.totalRooms - stats.activeRooms - stats.maintenanceRooms) || 0, fill: '#2563eb' }
                            ]}
                            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value} rooms`, 'Count']} />
                            <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                              {[
                                { name: 'Available', value: stats.activeRooms || 0, fill: '#10b981' },
                                { name: 'Maintenance', value: stats.maintenanceRooms || 0, fill: '#f59e0b' },
                                { name: 'Occupied', value: (stats.totalRooms - stats.activeRooms - stats.maintenanceRooms) || 0, fill: '#2563eb' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Daily/Weekly/Monthly Reservations */}
                  <Card className="border-secondary/20">
                    <CardHeader className="py-2 px-4 border-b border-secondary/20">
                      <CardTitle className="text-sm font-medium">Recent RFID Activity Trend</CardTitle>
                      <div className="flex items-center etween">
                        <CardDescription className="text-xs">
                          {rfidTimeRange === 'today' ? 'Today\'s activity by hour' :
                            rfidTimeRange === 'week' ? 'Last 7 days activity' :
                              'Last 30 days activity'}
                        </CardDescription>
                        <div className="flex space-x-2">
                          <Button
                            variant={rfidTimeRange === 'today' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRfidTimeRangeChange('today')}
                            className="text-xs h-7 px-2"
                          >
                            Today
                          </Button>
                          <Button
                            variant={rfidTimeRange === 'week' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRfidTimeRangeChange('week')}
                            className="text-xs h-7 px-2"
                          >
                            Week
                          </Button>
                          <Button
                            variant={rfidTimeRange === 'month' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleRfidTimeRangeChange('month')}
                            className="text-xs h-7 px-2"
                          >
                            Month
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const activityData = await getRfidActivityData(rfidTimeRange);
                                setRfidActivityData(activityData);
                              } catch (error) {
                                console.error("Error refreshing RFID activity data:", error);
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="text-xs h-7 px-2"
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 h-[200px]">
                      {/* Use real RFID logs data */}
                      <div className="w-full h-full flex items-center justify-center">
                        {rfidLogs.length > 0 ? (
                          <RFIDActivityChart
                            hours={rfidActivityData.hours}
                            entryData={rfidActivityData.entryData}
                            exitData={rfidActivityData.exitData}
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <p>No RFID activity data available</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Check-in/Check-out Activity Tab */}
        <TabsContent value="rfid-analytics" className="space-y-4">
          <Card className="border-secondary/20">
            <CardHeader className="border-b border-secondary/20 py-3">
              <CardTitle className="text-primary text-base">Student Check-in/Check-out Activity</CardTitle>
              <CardDescription className="text-xs">Monitor student movement patterns via RFID</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading RFID activity data...</p>
                </div>
              ) : (
                <>
                  {rfidLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No RFID activity data available</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="space-x-2 mb-4 flex justify-end">
                          <Button
                            variant={rfidActionFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleActionFilter('all')}
                          >
                            All
                          </Button>
                          <Button
                            variant={rfidActionFilter === 'entry' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleActionFilter('entry')}
                          >
                            Entries
                          </Button>
                          <Button
                            variant={rfidActionFilter === 'exit' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleActionFilter('exit')}
                          >
                            Exits
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Check-ins per Day/Week */}
                        <Card className="border-secondary/20">
                          <CardHeader className="py-2 px-4 border-b border-secondary/20">
                            <CardTitle className="text-sm font-medium">Recent RFID Activity</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 h-[250px] overflow-auto">
                            {/* Display actual RFID logs in a table format */}
                            <Table>
                              <TableHeader>
                                <TableRow className="border-secondary/20">
                                  <TableHead>Student</TableHead>
                                  <TableHead>Action</TableHead>
                                  <TableHead>Time</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rfidLogs.slice(0, 5).map((log, index) => (
                                  <TableRow key={log.id || index} className="border-secondary/20">
                                    <TableCell className="font-medium">{log.studentName}</TableCell>
                                    <TableCell>
                                      <Badge
                                        className={log.action === "entry" ? "bg-success text-white" : "bg-warning text-black"}
                                      >
                                        {log.action}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{log.timestamp}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>

                        {/* RFID Activity Summary */}
                        <Card className="border-secondary/20">
                          <CardHeader className="py-2 px-4 border-b border-secondary/20">
                            <CardTitle className="text-sm font-medium">RFID Activity Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 h-[250px] flex flex-col justify-center">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-muted/20 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-success">{stats.entriesCount}</div>
                                <div className="text-sm text-muted-foreground">Total Entries</div>
                              </div>
                              <div className="bg-muted/20 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-warning">{stats.exitsCount}</div>
                                <div className="text-sm text-muted-foreground">Total Exits</div>
                              </div>
                              <div className="bg-muted/20 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-primary">{stats.rfidEventsToday}</div>
                                <div className="text-sm text-muted-foreground">Events Today</div>
                              </div>
                              <div className="bg-muted/20 rounded-lg p-4 text-center">
                                <div className="text-3xl font-bold text-primary">{rfidLogs.length}</div>
                                <div className="text-sm text-muted-foreground">Recent Logs</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* RFID Activity Logs Table */}
                      <Card className="border-secondary/20">
                        <CardHeader className="py-2 px-4 border-b border-secondary/20">
                          <CardTitle className="text-sm font-medium">RFID Activity Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4 mb-6">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search by student ID or room..."
                                className="pl-10 border-secondary/20"
                                onChange={(e) => handleLogSearch(e.target.value)}
                              />
                            </div>
                          </div>

                          <Table>
                            <TableHeader>
                              <TableRow className="border-secondary/20">
                                <TableHead>Student ID</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Timestamp</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rfidLogs.length > 0 ? rfidLogs.map((log) => (
                                <TableRow key={log.id} className="border-secondary/20">
                                  <TableCell className="font-mono text-sm">{log.studentId}</TableCell>
                                  <TableCell className="font-medium">{log.studentName}</TableCell>
                                  <TableCell>{log.room}</TableCell>
                                  <TableCell>
                                    <Badge
                                      className={log.action === "entry" ? "bg-success text-white" : "bg-secondary text-black"}
                                    >
                                      {log.action}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                                </TableRow>
                              )) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-4">No RFID logs found</TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Summary Tab */}
        <TabsContent value="user-summary" className="space-y-4">
          <Card className="border-secondary/20">
            <CardHeader className="border-b border-secondary/20 py-3">
              <CardTitle className="text-primary text-base">User Management Summary</CardTitle>
              <CardDescription className="text-xs">Overview of system users and activity</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading user data...</p>
                </div>
              ) : (
                <>
                  {/* User count summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-secondary/20">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm font-medium text-center">Total Students</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-primary">{stats.studentCount}</div>
                        <p className="text-xs text-muted-foreground">Registered student accounts</p>
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/20">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm font-medium text-center">Total Managers</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-primary">{stats.staffCount}</div>
                        <p className="text-xs text-muted-foreground">Registered manager accounts</p>
                      </CardContent>
                    </Card>

                    <Card className="border-secondary/20">
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm font-medium text-center">Total Admin</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl font-bold text-primary">{stats.totalUsers - stats.studentCount - stats.staffCount}</div>
                        <p className="text-xs text-muted-foreground">Registered admin accounts</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* User Management Tools */}
                  <Card className="border-secondary/20 mb-6">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-secondary/20 py-3">
                      <div>
                        <CardTitle className="text-primary text-base">User Account Management</CardTitle>
                        <CardDescription className="text-xs">Register and manage user accounts</CardDescription>
                      </div>
                      <Button
                        className="bg-primary hover:bg-primary/90 text-white text-xs h-8"
                        onClick={() => setShowRegisterModal(true)} 
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Register New User
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search users..."
                            className="pl-10 border-secondary/20"
                            onChange={(e) => handleUserSearch(e.target.value)}
                          />
                        </div>
                        <Select
                          defaultValue="all"
                          onValueChange={(value) => handleRoleFilter(value)}
                        >
                          <SelectTrigger className="w-32 border-secondary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="student">Students</SelectItem>
                            <SelectItem value="manager">Managers</SelectItem>
                            <SelectItem value="admin">Admins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Active Users */}
                  <Card className="border-secondary/20">
                    <CardHeader className="py-2 px-4 border-b border-secondary/20">
                      <CardTitle className="text-sm font-medium">Top Active Users</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-secondary/20">
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.slice(0, 5).map((user, index) => (
                            <TableRow key={user.id} className="border-secondary/20">
                              <TableCell>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    user.role === "admin"
                                      ? "bg-primary text-white"
                                      : user.role === "manager"
                                        ? "bg-warning text-black"
                                        : "bg-secondary text-black"
                                  }
                                >
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    user.status === "active" || user.status === "entry"
                                      ? "bg-success text-white"
                                      : "bg-warning text-white"
                                  }
                                >
                                  {user.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-secondary/20 text-primary hover:bg-secondary/10"
                                    onClick={() => openEditUserModal(user)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
     <RegistrationModal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)} />
    <EditUserModal isOpen={showEditModal} onClose={()=>setShowEditModal(false)} editUser={editUserForm}/>

    </>
    
  )
}
