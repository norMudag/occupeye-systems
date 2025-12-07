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
import {
  getUsers,
  getRooms,
  getRfidLogs,
  getDashboardStats,
  generateStudentId,
  generateManagerId,
  User,
  Room as AdminRoom,
  RfidLog,
  DashboardStats,
  updateUser,
  deleteUser,
  updateRoom,
  createRoom,
  getRfidActivityData
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
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuthState } from 'react-firebase-hooks/auth'
import { StatusDistributionChart, WeeklyTrendChart, RFIDActivityChart } from "@/components/charts/DashboardCharts"
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts'

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

  // User registration modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    studentId: '',
    managerId: '',
    academicStatus: 'N/A',
    managedBuildings: [] as string[]
  })
  const [registerError, setRegisterError] = useState('')

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
  const [roomError, setRoomError] = useState('')

  // Room edit modal state
  const [editRoomModalOpen, setEditRoomModalOpen] = useState(false)
  const [editRoomLoading, setEditRoomLoading] = useState(false)
  const [editRoomForm, setEditRoomForm] = useState<AdminRoom | null>(null)
  const [editRoomError, setEditRoomError] = useState('')

  // User edit modal state
  const [editUserModalOpen, setEditUserModalOpen] = useState(false)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editUserForm, setEditUserForm] = useState<User | null>(null)
  const [editUserError, setEditUserError] = useState('')

  // User delete confirmation
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Available buildings/dormitories
  const availableBuildings = [
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
  ];

  // Academic Status options
  const academicStatusOptions = [
    "full scholar",
    "muslim grant",
    "partial scholar",
    "cultural scholar",
    "N/A"
  ];

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

  // Handle register form change
  const handleRegisterFormChange = (field: string, value: string) => {
    setRegisterForm({
      ...registerForm,
      [field]: value
    })

    // Clear error when user types
    setRegisterError('')
  }

  // Handle register form array change (for managedBuildings)
  const handleRegisterFormArrayChange = (field: string, value: string[]) => {
    setRegisterForm({
      ...registerForm,
      [field]: value
    })

    // Clear error when user types
    setRegisterError('')
  }

  // Handle dormitory toggle for managers
  const handleDormitoryToggle = (dormitory: string) => {
    if (!editUserForm) return

    const currentBuildings = editUserForm.managedBuildings || []

    if (currentBuildings.includes(dormitory)) {
      // Remove dormitory if already selected
      setEditUserForm({
        ...editUserForm,
        managedBuildings: currentBuildings.filter(b => b !== dormitory)
      })
    } else {
      // Add dormitory if not selected
      setEditUserForm({
        ...editUserForm,
        managedBuildings: [...currentBuildings, dormitory]
      })
    }
  }

  // Handle role change with automatic ID generation
  const handleRoleChange = async (role: string) => {
    try {
      // When changing to student or manager, generate appropriate ID automatically
      let newId = null;

      if (role === 'student') {
        newId = await generateStudentId();
      } else if (role === 'manager') {
        newId = await generateManagerId();
      }

      setRegisterForm({
        ...registerForm,
        role: role,
        studentId: role === 'student' ? newId || '' : '',
        managerId: role === 'manager' ? newId || '' : '',
        academicStatus: role === 'student' ? registerForm.academicStatus : 'N/A',
        managedBuildings: role === 'manager' ? registerForm.managedBuildings : []
      });
    } catch (error) {
      console.error("Error generating ID:", error);
    }
  }

  // Open register modal
  const openRegisterModal = async () => {
    try {
      // Generate a default student ID when opening the modal
      const studentId = await generateStudentId();

      setRegisterForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        studentId: studentId,
        managerId: '',
        academicStatus: 'N/A',
        managedBuildings: []
      });

      setRegisterError('');
      setRegisterModalOpen(true);
    } catch (error) {
      console.error("Error preparing registration form:", error);
      toast.error("Failed to prepare registration form");
    }
  }

  // Close register modal
  const closeRegisterModal = () => {
    setRegisterModalOpen(false)
    setRegisterError('')
  }

  // Handle register form submission
  const handleRegister = async () => {
    // Form validation
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email ||
      !registerForm.password || !registerForm.confirmPassword) {
      setRegisterError("All fields are required")
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("Passwords do not match")
      return
    }

    if (registerForm.password.length < 6) {
      setRegisterError("Password must be at least 6 characters")
      return
    }

    // If role is student, student ID is required
    if (registerForm.role === 'student' && !registerForm.studentId) {
      setRegisterError("Student ID is required for student accounts")
      return
    }

    // If role is manager, manager ID is required
    if (registerForm.role === 'manager' && !registerForm.managerId) {
      setRegisterError("Manager ID is required for manager accounts")
      return
    }

    try {
      setRegisterLoading(true)

      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        registerForm.email,
        registerForm.password
      )

      // Prepare user data with appropriate null values
      const userData: Record<string, any> = {
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        email: registerForm.email,
        role: registerForm.role,
        status: 'exit', // Default to 'exit' since new users start outside the building
        createdAt: new Date().toISOString()
      }

      // Add role-specific fields
      if (registerForm.role === 'student') {
        userData.studentId = registerForm.studentId || null
        userData.academicStatus = registerForm.academicStatus || null
        userData.managerId = null
        userData.managedBuildings = []
      } else if (registerForm.role === 'manager') {
        userData.managerId = registerForm.managerId || null
        userData.studentId = null
        userData.academicStatus = null
        userData.managedBuildings = registerForm.managedBuildings || []
      } else {
        // Admin role
        userData.studentId = null
        userData.managerId = null
        userData.academicStatus = null
        userData.managedBuildings = []
      }

      // Store additional user information in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), userData)

      // Refresh user list
      const updatedUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      setUsers(updatedUsers)

      // Update stats
      const dashboardStats = await getDashboardStats()
      setStats(dashboardStats)

      // Close modal and show success message
      closeRegisterModal()
      toast.success("User registered successfully")
    } catch (error: any) {
      console.error("Error registering user:", error)

      if (error.code === 'auth/email-already-in-use') {
        setRegisterError("Email is already in use")
      } else {
        setRegisterError(error.message || "Failed to register user")
      }
    } finally {
      setRegisterLoading(false)
    }
  }

  // Handle room form change
  const handleRoomFormChange = (field: string, value: any) => {
    setRoomForm({
      ...roomForm,
      [field]: value
    })

    // Clear error when user types
    setRoomError('')
  }

  // Open room modal
  const openRoomModal = () => {
    setRoomForm({
      name: '',
      building: '',
      capacity: 1,
      status: 'available',
      rfidEnabled: false
    })
    setRoomError('')
    setRoomModalOpen(true)
  }

  // Close room modal
  const closeRoomModal = () => {
    setRoomModalOpen(false)
    setRoomError('')
  }

  // Handle room form submission
  const handleCreateRoom = async () => {
    // Form validation
    if (!roomForm.name || !roomForm.building) {
      setRoomError("Room number and building are required")
      return
    }

    if (roomForm.capacity < 1) {
      setRoomError("Room capacity must be at least 1")
      return
    }

    try {
      setRoomLoading(true)

      // Create new room in Firestore
      const newRoomId = await createRoom({
        name: roomForm.name,
        building: roomForm.building,
        capacity: Number(roomForm.capacity),
        status: roomForm.status,
        rfidEnabled: roomForm.rfidEnabled,
        availableRooms: roomForm.capacity,
        currentOccupants: 0
      })

      if (!newRoomId) {
        throw new Error("Failed to create room")
      }

      // Refresh room list
      const updatedRooms = await getRooms()
      setRooms(updatedRooms)

      // Update stats
      const dashboardStats = await getDashboardStats()
      setStats(dashboardStats)

      // Close modal and show success message
      closeRoomModal()
      toast.success("Room created successfully")
    } catch (error: any) {
      console.error("Error creating room:", error)
      setRoomError(error.message || "Failed to create room")
    } finally {
      setRoomLoading(false)
    }
  }

  // Open edit room modal
  const openEditRoomModal = (room: AdminRoom) => {
    setEditRoomForm(room)
    setEditRoomError('')
    setEditRoomModalOpen(true)
  }

  // Close edit room modal
  const closeEditRoomModal = () => {
    setEditRoomModalOpen(false)
    setEditRoomError('')
  }

  // Handle edit room form change
  const handleEditRoomFormChange = (field: string, value: any) => {
    if (editRoomForm) {
      setEditRoomForm({
        ...editRoomForm,
        [field]: value
      })
    }

    // Clear error when user types
    setEditRoomError('')
  }

  // Handle room settings
  const handleRoomSettings = (roomId: string) => {
    toast.info(`Room settings for ${roomId} - functionality coming soon!`)
  }

  // Handle edit room form submission
  const handleUpdateRoom = async () => {
    if (!editRoomForm) return

    // Form validation
    if (!editRoomForm.name || !editRoomForm.building) {
      setEditRoomError("Room number and building are required")
      return
    }

    if (editRoomForm.capacity < 1) {
      setEditRoomError("Room capacity must be at least 1")
      return
    }

    try {
      setEditRoomLoading(true)

      // Update room in Firestore
      const updated = await updateRoom(editRoomForm.id, {
        name: editRoomForm.name,
        building: editRoomForm.building,
        capacity: Number(editRoomForm.capacity),
        status: editRoomForm.status,
        rfidEnabled: editRoomForm.rfidEnabled
      })

      if (!updated) {
        throw new Error("Failed to update room")
      }

      // Refresh room list
      const updatedRooms = await getRooms()
      setRooms(updatedRooms)

      // Update stats
      const dashboardStats = await getDashboardStats()
      setStats(dashboardStats)

      // Close modal and show success message
      closeEditRoomModal()
      toast.success("Room updated successfully")
    } catch (error: any) {
      console.error("Error updating room:", error)
      setEditRoomError(error.message || "Failed to update room")
    } finally {
      setEditRoomLoading(false)
    }
  }

  // Open edit user modal
  const openEditUserModal = (user: User) => {
    setEditUserForm(user)
    setEditUserError('')
    setEditUserModalOpen(true)
  }

  // Close edit user modal
  const closeEditUserModal = () => {
    setEditUserModalOpen(false)
    setEditUserError('')
  }

  // Handle edit user form change
  const handleEditUserFormChange = (field: string, value: any) => {
    if (editUserForm) {
      setEditUserForm({
        ...editUserForm,
        [field]: value
      })
    }

    // Clear error when user types
    setEditUserError('')
  }

  // Handle edit user role change with automatic ID generation
  const handleEditUserRoleChange = async (role: string) => {
    if (!editUserForm) return;

    try {
      let newId = null;

      // Only generate a new ID if the role is changing to student or manager
      if (role === 'student' && editUserForm.role !== 'student') {
        newId = await generateStudentId();
      } else if (role === 'manager' && editUserForm.role !== 'manager') {
        newId = await generateManagerId();
      }

      // Create updated user form with proper field values based on role
      const updatedForm = {
        ...editUserForm,
        role: role
      };

      // Set role-specific fields
      if (role === 'student') {
        updatedForm.studentId = editUserForm.role === 'student' ? editUserForm.studentId : newId;
        updatedForm.academicStatus = editUserForm.role === 'student' ? editUserForm.academicStatus : 'N/A';
        updatedForm.managerId = null;
        updatedForm.managedBuildings = [];
      } else if (role === 'manager') {
        updatedForm.managerId = editUserForm.role === 'manager' ? editUserForm.managerId : newId;
        updatedForm.studentId = null;
        updatedForm.academicStatus = null;
        updatedForm.managedBuildings = editUserForm.managedBuildings || [];
      } else {
        // Admin role
        updatedForm.studentId = null;
        updatedForm.managerId = null;
        updatedForm.academicStatus = null;
        updatedForm.managedBuildings = [];
      }

      setEditUserForm(updatedForm);
    } catch (error) {
      console.error("Error updating role:", error);
      setEditUserError("Failed to update role");
    }
  }

  // Handle edit user form submission
  const handleUpdateUser = async () => {
    if (!editUserForm) return

    // Form validation
    if (!editUserForm.firstName || !editUserForm.lastName || !editUserForm.email) {
      setEditUserError("Name and email are required")
      return
    }

    // If role is student, student ID is required
    if (editUserForm.role === 'student' && !editUserForm.studentId) {
      setEditUserError("Student ID is required for student accounts")
      return
    }

    // If role is manager, manager ID is required
    if (editUserForm.role === 'manager' && !editUserForm.managerId) {
      setEditUserError("Manager ID is required for manager accounts")
      return
    }

    try {
      setEditUserLoading(true)

      // Prepare update data with role-specific fields
      let userData: Record<string, any> = {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        email: editUserForm.email,
        role: editUserForm.role,
        status: editUserForm.status,
        rfidCard: editUserForm.rfidCard || null
      }

      // Set specific fields based on user role
      if (editUserForm.role === 'student') {
        userData.studentId = editUserForm.studentId || null
        userData.academicStatus = editUserForm.academicStatus || null
        userData.managerId = null
        userData.managedBuildings = []
      } else if (editUserForm.role === 'manager') {
        userData.managerId = editUserForm.managerId || null
        userData.studentId = null
        userData.academicStatus = null
        userData.managedBuildings = editUserForm.managedBuildings || []
      } else {
        // Admin role
        userData.studentId = null
        userData.managerId = null
        userData.academicStatus = null
        userData.managedBuildings = []
      }

      // Update user in Firestore
      const updated = await updateUser(editUserForm.id, userData)

      if (!updated) {
        throw new Error("Failed to update user")
      }

      // Refresh user list
      const updatedUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      setUsers(updatedUsers)

      // Update stats
      const dashboardStats = await getDashboardStats()
      setStats(dashboardStats)

      // Close modal and show success message
      closeEditUserModal()
      toast.success("User updated successfully")
    } catch (error: any) {
      console.error("Error updating user:", error)
      setEditUserError(error.message || "Failed to update user")
    } finally {
      setEditUserLoading(false)
    }
  }

  // Open delete user confirmation
  const openDeleteUserModal = (user: User) => {
    setUserToDelete(user)
    setDeleteUserModalOpen(true)
  }

  // Close delete user confirmation
  const closeDeleteUserModal = () => {
    setDeleteUserModalOpen(false)
    setUserToDelete(null)
  }

  // Handle user deletion
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeleteUserLoading(true)

      // Delete user from Firestore
      const deleted = await deleteUser(userToDelete.id)

      if (!deleted) {
        throw new Error("Failed to delete user")
      }

      // Refresh user list
      const updatedUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      setUsers(updatedUsers)

      // Update stats
      const dashboardStats = await getDashboardStats()
      setStats(dashboardStats)

      // Close modal and show success message
      closeDeleteUserModal()
      toast.success("User deleted successfully")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.message || "Failed to delete user")
    } finally {
      setDeleteUserLoading(false)
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
        <p className="text-gray-600 text-xs">System administration and user management</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center">
              <Users className="h-4 w-4 mr-2 text-primary" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500">{stats.studentCount} students, {stats.staffCount} staff</p>
          </CardContent>
        </Card>

        {/* Room Status */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center">
              <Building className="h-4 w-4 mr-2 text-primary" />
              Room Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRooms}</div>
            <p className="text-xs text-gray-500">{stats.maintenanceRooms} maintenance, {stats.activeRooms} active</p>
          </CardContent>
        </Card>

        {/* RFID Events Today */}
        <Card>
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-base flex items-center">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              RFID Events Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rfidEventsToday}</div>
            <p className="text-xs text-gray-500">{stats.entriesCount} entries, {stats.exitsCount} exits</p>
          </CardContent>
        </Card>

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
                        <CardTitle className="text-sm font-medium">Dormitory Availability</CardTitle>
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
                        onClick={openRegisterModal}
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

      {/* User Registration Modal */}
      <Dialog open={registerModalOpen} onOpenChange={closeRegisterModal}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Register New User</DialogTitle>
            <DialogDescription>
              Create a new user account. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={registerForm.firstName}
                  onChange={(e) => handleRegisterFormChange('firstName', e.target.value)}
                  className="border-secondary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={registerForm.lastName}
                  onChange={(e) => handleRegisterFormChange('lastName', e.target.value)}
                  className="border-secondary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={registerForm.email}
                onChange={(e) => handleRegisterFormChange('email', e.target.value)}
                className="border-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={registerForm.role}
                onValueChange={(value) => handleRoleChange(value)}
              >
                <SelectTrigger className="w-full border-secondary/20">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {registerForm.role === 'student' && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="studentId">Student ID (Auto-generated)</Label>
                  <Input
                    id="studentId"
                    value={registerForm.studentId}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="academicStatus">Academic Status</Label>
                  <Select
                    value={registerForm.academicStatus}
                    onValueChange={(value) => handleRegisterFormChange('academicStatus', value)}
                  >
                    <SelectTrigger id="academicStatus">
                      <SelectValue placeholder="Select academic status" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {registerForm.role === 'manager' && (
              <>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="managerId">Manager ID (Auto-generated)</Label>
                  <Input
                    id="managerId"
                    value={registerForm.managerId}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label>Managed Dormitories</Label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {availableBuildings.map((dormitory) => (
                        <div key={dormitory} className="flex items-center space-x-2">
                          <Checkbox
                            id={`register-dormitory-${dormitory}`}
                            checked={registerForm.managedBuildings.includes(dormitory)}
                            onCheckedChange={(checked) => {
                              if (checked === true) {
                                setRegisterForm({
                                  ...registerForm,
                                  managedBuildings: [...registerForm.managedBuildings, dormitory]
                                });
                              } else {
                                setRegisterForm({
                                  ...registerForm,
                                  managedBuildings: registerForm.managedBuildings.filter(d => d !== dormitory)
                                });
                              }
                              setRegisterError('');
                            }}
                          />
                          <Label
                            htmlFor={`register-dormitory-${dormitory}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {dormitory}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={registerForm.password}
                onChange={(e) => handleRegisterFormChange('password', e.target.value)}
                className="border-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) => handleRegisterFormChange('confirmPassword', e.target.value)}
                className="border-secondary/20"
              />
            </div>
            {registerError && (
              <div className="text-sm text-red-500 pt-1">
                {registerError}
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-secondary/20"
              onClick={closeRegisterModal}
              disabled={registerLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleRegister}
              disabled={registerLoading}
            >
              {registerLoading ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Creation Modal */}
      <Dialog open={roomModalOpen} onOpenChange={closeRoomModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Add New Room</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new room.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room Number</Label>
              <Input
                id="name"
                value={roomForm.name}
                onChange={(e) => handleRoomFormChange('name', e.target.value)}
                className="border-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building">Building</Label>
              <Select
                value={roomForm.building}
                onValueChange={(value) => handleRoomFormChange('building', value)}
              >
                <SelectTrigger className="w-full border-secondary/20">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {availableBuildings.map((building) => (
                    <SelectItem key={building} value={building}>
                      {building}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={roomForm.capacity}
                onChange={(e) => handleRoomFormChange('capacity', Number(e.target.value))}
                className="border-secondary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={roomForm.status}
                onValueChange={(value) => handleRoomFormChange('status', value)}
              >
                <SelectTrigger className="w-full border-secondary/20">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfidEnabled">RFID Enabled</Label>
              <Select
                value={roomForm.rfidEnabled ? "true" : "false"}
                onValueChange={(value) => handleRoomFormChange('rfidEnabled', value === "true")}
              >
                <SelectTrigger className="w-full border-secondary/20">
                  <SelectValue placeholder="Select RFID status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {roomError && (
              <div className="text-sm text-red-500 pt-1">
                {roomError}
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-secondary/20"
              onClick={closeRoomModal}
              disabled={roomLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleCreateRoom}
              disabled={roomLoading}
            >
              {roomLoading ? "Creating..." : "Add Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Room Edit Modal */}
      <Dialog open={editRoomModalOpen} onOpenChange={closeEditRoomModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit Room</DialogTitle>
            <DialogDescription>
              Update the room details.
            </DialogDescription>
          </DialogHeader>
          {editRoomForm && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Room Number</Label>
                <Input
                  id="edit-name"
                  value={editRoomForm.name}
                  onChange={(e) => handleEditRoomFormChange('name', e.target.value)}
                  className="border-secondary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-building">Building</Label>
                <Select
                  value={editRoomForm.building}
                  onValueChange={(value) => handleEditRoomFormChange('building', value)}
                >
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={editRoomForm.capacity}
                  onChange={(e) => handleEditRoomFormChange('capacity', Number(e.target.value))}
                  className="border-secondary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editRoomForm.status}
                  onValueChange={(value) => handleEditRoomFormChange('status', value)}
                >
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rfidEnabled">RFID Enabled</Label>
                <Select
                  value={editRoomForm.rfidEnabled ? "true" : "false"}
                  onValueChange={(value) => handleEditRoomFormChange('rfidEnabled', value === "true")}
                >
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select RFID status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRoomError && (
                <div className="text-sm text-red-500 pt-1">
                  {editRoomError}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-secondary/20"
              onClick={closeEditRoomModal}
              disabled={editRoomLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleUpdateRoom}
              disabled={editRoomLoading}
            >
              {editRoomLoading ? "Updating..." : "Update Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Edit Modal */}
      <Dialog open={editUserModalOpen} onOpenChange={closeEditUserModal}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Edit User</DialogTitle>
            <DialogDescription>
              Update user information.
            </DialogDescription>
          </DialogHeader>
          {editUserForm && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editUserForm.firstName}
                    onChange={(e) => handleEditUserFormChange('firstName', e.target.value)}
                    className="border-secondary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editUserForm.lastName}
                    onChange={(e) => handleEditUserFormChange('lastName', e.target.value)}
                    className="border-secondary/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => handleEditUserFormChange('email', e.target.value)}
                  className="border-secondary/20"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editUserForm.role}
                  onValueChange={(value) => handleEditUserRoleChange(value)}
                >
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editUserForm.role === 'student' && (
                <>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="editStudentId">Student ID (Auto-generated)</Label>
                    <Input
                      id="editStudentId"
                      value={editUserForm.studentId || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="editAcademicStatus">Academic Status</Label>
                    <Select
                      value={editUserForm.academicStatus || 'N/A'}
                      onValueChange={(value) => handleEditUserFormChange('academicStatus', value)}
                    >
                      <SelectTrigger id="editAcademicStatus">
                        <SelectValue placeholder="Select academic status" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {editUserForm.role === 'manager' && (
                <>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="editManagerId">Manager ID (Auto-generated)</Label>
                    <Input
                      id="editManagerId"
                      value={editUserForm.managerId || ''}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label>Managed Dormitories</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {availableBuildings.map((dormitory) => (
                          <div key={dormitory} className="flex items-center space-x-2">
                            <Checkbox
                              id={`dormitory-${dormitory}`}
                              checked={(editUserForm.managedBuildings || []).includes(dormitory)}
                              onCheckedChange={() => handleDormitoryToggle(dormitory)}
                            />
                            <Label
                              htmlFor={`dormitory-${dormitory}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {dormitory}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editUserForm.status}
                  onValueChange={(value) => handleEditUserFormChange('status', value)}
                >
                  <SelectTrigger className="w-full border-secondary/20">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry (Inside)</SelectItem>
                    <SelectItem value="exit">Exit (Outside)</SelectItem>
                    <SelectItem value="active">Active (Legacy)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-rfidCard">RFID Card ID</Label>
                <Input
                  id="edit-rfidCard"
                  value={editUserForm.rfidCard || ''}
                  onChange={(e) => handleEditUserFormChange('rfidCard', e.target.value)}
                  className="border-secondary/20"
                />
              </div>
              {editUserError && (
                <div className="text-sm text-red-500 pt-1">
                  {editUserError}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-secondary/20"
              onClick={closeEditUserModal}
              disabled={editUserLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={handleUpdateUser}
              disabled={editUserLoading}
            >
              {editUserLoading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Delete Confirmation */}
      <Dialog open={deleteUserModalOpen} onOpenChange={closeDeleteUserModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-warning">Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <p className="mb-2"><strong>Name:</strong> {userToDelete.firstName} {userToDelete.lastName}</p>
              <p className="mb-2"><strong>Email:</strong> {userToDelete.email}</p>
              <p className="mb-2"><strong>Role:</strong> {userToDelete.role}</p>
              {userToDelete.studentId && (
                <p className="mb-2"><strong>Student ID:</strong> {userToDelete.studentId}</p>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="border-secondary/20"
              onClick={closeDeleteUserModal}
              disabled={deleteUserLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-warning hover:bg-warning/90 text-white"
              onClick={handleDeleteUser}
              disabled={deleteUserLoading}
            >
              {deleteUserLoading ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
