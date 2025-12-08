// practicing to apply it on manager as a user management

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Plus, Edit, Trash2, Settings, RefreshCw, X, ChevronLeft, ChevronRight } from "lucide-react"
import { 
  getUsers, 
  User,
  updateUser,
  deleteUser,
  generateStudentId,
  generateManagerId
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
import { auth } from "@/lib/firebase"
import { Checkbox } from "@/components/ui/checkbox"

export default function UserManagement() {
  // State variables
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  
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
  
  // User edit modal state
  const [editUserModalOpen, setEditUserModalOpen] = useState(false)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editUserForm, setEditUserForm] = useState<User | null>(null)
  const [editUserError, setEditUserError] = useState('')
  
  // User delete confirmation
  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  // Academic Status options
  const academicStatusOptions = [
    "full scholar",
    "muslim grant", 
    "partial scholar",
    "cultural scholar",
    "N/A"
  ];

  // Available dormitories list
  const availableDormitories = [
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

  // Fetch data on component mount
  useEffect(() => {
    fetchUsers()
  }, [])

  // Update total pages when users list changes
  useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(users.length / itemsPerPage)))
    // Reset to page 1 if current page would be out of bounds
    if (currentPage > Math.ceil(users.length / itemsPerPage)) {
      setCurrentPage(1)
    }
  }, [users, itemsPerPage])

  const fetchUsers = async (role?: string) => {
    try {
      setLoading(true)
      const allUsers = await getUsers(role || userRoleFilter !== 'all' ? userRoleFilter : undefined)
      setUsers(allUsers)
      // Reset to first page when loading new data
      setCurrentPage(1)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  // Handle filtering users by role
  const handleRoleFilter = async (role: string) => {
    setUserRoleFilter(role)
    try {
      setLoading(true)
      const filteredUsers = await getUsers(role !== 'all' ? role : undefined)
      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error filtering users:", error)
      toast.error("Failed to filter users")
    } finally {
      setLoading(false)
    }
  }

  // Handle user search
  const handleUserSearch = async () => {
    if (!searchTerm.trim()) {
      fetchUsers()
      return
    }
    
    try {
      setLoading(true)
      // Note: This is a client-side filter
      const allUsers = await getUsers(userRoleFilter === 'all' ? undefined : userRoleFilter)
      const filteredUsers = allUsers.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.studentId && user.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setUsers(filteredUsers)
    } catch (error) {
      console.error("Error searching users:", error)
      toast.error("Search failed")
    } finally {
      setLoading(false)
    }
  }
  
  // Handle register form change
  const handleRegisterFormChange = (field: string, value: string) => {
    setRegisterForm({
      ...registerForm,
      [field]: value
    })
    
    // Clear error when user starts typing
    if (registerError) {
      setRegisterError('')
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
        studentId: studentId || '',
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
  
  // Handle register user
  const handleRegister = async () => {
    // Validate form
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.email || 
        !registerForm.password || !registerForm.confirmPassword) {
      setRegisterError('Please fill in all required fields')
      return
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match')
      return
    }
    
    if (registerForm.password.length < 6) {
      setRegisterError('Password must be at least 6 characters')
      return
    }
    
    // If student role, student ID is required
    if (registerForm.role === 'student' && !registerForm.studentId) {
      setRegisterError('Student ID is required for student accounts')
      return
    }
    
    // If manager role, manager ID is required
    if (registerForm.role === 'manager' && !registerForm.managerId) {
      setRegisterError('Manager ID is required for manager accounts')
      return
    }
    
    try {
      setRegisterLoading(true)
      
      // Create user document for Firestore
      const userData: Record<string, any> = {
        firstName: registerForm.firstName,
        lastName: registerForm.lastName,
        email: registerForm.email,
        role: registerForm.role,
        status: 'exit',
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
      
      // Call our API endpoint to create the user
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          userData: userData
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }
      
      toast.success('User created successfully')
      closeRegisterModal()
      
      // Refresh users list
      fetchUsers()
    } catch (error: any) {
      console.error("Error registering user:", error)
      setRegisterError(error.message || 'Failed to register user')
    } finally {
      setRegisterLoading(false)
    }
  }
  
  // Edit user functions
  const openEditUserModal = (user: User) => {
    setEditUserForm(user)
    setEditUserError('')
    setEditUserModalOpen(true)
  }
  
  const closeEditUserModal = () => {
    setEditUserModalOpen(false)
    setEditUserError('')
  }
  
  const handleEditUserFormChange = (field: string, value: any) => {
    if (!editUserForm) return
    
    setEditUserForm({
      ...editUserForm,
      [field]: value
    })
    
    // Clear error when user starts typing
    if (editUserError) {
      setEditUserError('')
    }
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
  
  // Handle checkbox change for dormitory selection
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
  
  // Handle update user with proper field handling
  const handleUpdateUser = async () => {
    if (!editUserForm) return
    
    try {
      setEditUserLoading(true)
      
      // Prepare update data
      const updateData: Partial<User> = {
        firstName: editUserForm.firstName,
        lastName: editUserForm.lastName,
        role: editUserForm.role,
        status: editUserForm.status
      }
      
      // Add fields based on role
      if (editUserForm.role === 'student') {
        updateData.studentId = editUserForm.studentId || null
        updateData.academicStatus = editUserForm.academicStatus || null
        updateData.managerId = null
        updateData.managedBuildings = []
      } else if (editUserForm.role === 'manager') {
        updateData.managerId = editUserForm.managerId || null
        updateData.studentId = null
        updateData.academicStatus = null
        updateData.managedBuildings = editUserForm.managedBuildings || []
      } else {
        // Admin role
        updateData.studentId = null
        updateData.managerId = null
        updateData.academicStatus = null
        updateData.managedBuildings = []
      }
      
      const success = await updateUser(editUserForm.id, updateData)
      
      if (success) {
        toast.success('User updated successfully')
        closeEditUserModal()
        
        // Refresh users list
        fetchUsers()
      } else {
        throw new Error('Failed to update user')
      }
    } catch (error: any) {
      console.error("Error updating user:", error)
      setEditUserError(error.message || 'Failed to update user')
    } finally {
      setEditUserLoading(false)
    }
  }
  
  // Delete user functions
  const openDeleteUserModal = (user: User) => {
    setUserToDelete(user)
    setDeleteUserModalOpen(true)
  }
  
  const closeDeleteUserModal = () => {
    setDeleteUserModalOpen(false)
    setUserToDelete(null)
  }
  
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      setDeleteUserLoading(true)
      
      const success = await deleteUser(userToDelete.id)
      
      if (success) {
        toast.success('User deleted successfully')
        closeDeleteUserModal()
        
        // Refresh users list
        fetchUsers()
      } else {
        throw new Error('Failed to delete user')
      }
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.message || 'Failed to delete user')
    } finally {
      setDeleteUserLoading(false)
    }
  }

  // Pagination controls
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const changeItemsPerPage = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Get current page of users
  const getCurrentPageUsers = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return users.slice(startIndex, endIndex)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">User Management</h1>
            <p className="text-gray-600 mt-2">
              Manage user accounts across the OccupEye system
            </p>
          </div>

          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={openRegisterModal}
          >
            <Plus className="h-4 w-4 mr-2 text-white" />
            <span className="text-white">Add New User</span>
          </Button>
        </div>

        <Card className="border-secondary/20 mb-8">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary flex items-center">
              <Users className="h-5 w-5 mr-2" />
              User Accounts
            </CardTitle>
            <CardDescription>
              View and manage all user accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex-1 w-full md:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name, email, or ID..."
                    className="pl-10 border-secondary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                  />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <Select value={userRoleFilter} onValueChange={handleRoleFilter}>
                  <SelectTrigger className="w-[180px] border-secondary/20">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="manager">Managers</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  className="border-secondary/20"
                  onClick={() => fetchUsers()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 border rounded-lg border-secondary/20">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? 'No users match your search criteria' : 'There are no users in the system yet'}
                </p>
                <Button 
                  variant="outline" 
                  className="border-secondary/20"
                  onClick={openRegisterModal}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/20">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Academic Status</TableHead>
                      <TableHead>RFID Card</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {getCurrentPageUsers().map((user) => (
                      <TableRow key={user.id} className="border-secondary/20">
                        <TableCell>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`
                            ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 
                              user.role === 'manager' ? 'bg-warning/10 text-warning border-warning/20' : 
                              'bg-secondary/10 text-secondary border-secondary/20'
                            }
                          `}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role === 'student' ? user.studentId || '-' : 
                           user.role === 'manager' ? user.managerId || '-' : '-'}
                        </TableCell>
                        <TableCell>
                          {user.role === 'student' ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-600 border-blue-200">
                              {user.academicStatus || 'N/A'}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {user.rfidCard ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              Linked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
                              None
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={
                              user.status === 'entry' 
                                ? 'bg-success text-white' 
                                : user.status === 'exit'
                                  ? 'bg-warning text-white'
                                  : user.status === 'active'
                                    ? 'bg-primary text-white'
                                    : 'bg-destructive text-white'
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.createdAt}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-secondary/20"
                              onClick={() => openEditUserModal(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 border-red-200 hover:bg-red-50 hover:text-red-600"
                              onClick={() => openDeleteUserModal(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500">
                      Showing {Math.min(users.length, (currentPage - 1) * itemsPerPage + 1)}-
                      {Math.min(users.length, currentPage * itemsPerPage)} of {users.length} users
                    </p>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="itemsPerPage" className="text-sm">Per page:</Label>
                      <Select value={itemsPerPage.toString()} onValueChange={changeItemsPerPage}>
                        <SelectTrigger id="itemsPerPage" className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0 border-secondary/20"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0 border-secondary/20"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Register User Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account in the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={registerForm.firstName}
                  onChange={(e) => handleRegisterFormChange('firstName', e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={registerForm.lastName}
                  onChange={(e) => handleRegisterFormChange('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={registerForm.email}
                onChange={(e) => handleRegisterFormChange('email', e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={registerForm.role} 
                onValueChange={(value) => handleRoleChange(value)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
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
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="managerId">Manager ID (Auto-generated)</Label>
                <Input
                  id="managerId"
                  value={registerForm.managerId}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            )}
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={registerForm.password}
                onChange={(e) => handleRegisterFormChange('password', e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={registerForm.confirmPassword}
                onChange={(e) => handleRegisterFormChange('confirmPassword', e.target.value)}
              />
            </div>
            {registerError && (
              <div className="text-sm text-red-500 mt-2">{registerError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRegisterModal}>
              Cancel
            </Button>
            <Button onClick={handleRegister} disabled={registerLoading} className="bg-primary text-white">
              {registerLoading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      {editUserForm && (
        <Dialog open={editUserModalOpen} onOpenChange={setEditUserModalOpen}>
          <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user account information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="editFirstName">First Name</Label>
                  <Input
                    id="editFirstName"
                    value={editUserForm.firstName}
                    onChange={(e) => handleEditUserFormChange('firstName', e.target.value)}
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="editLastName">Last Name</Label>
                  <Input
                    id="editLastName"
                    value={editUserForm.lastName}
                    onChange={(e) => handleEditUserFormChange('lastName', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editUserForm.email}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="editRole">Role</Label>
                <Select 
                  value={editUserForm.role} 
                  onValueChange={(value) => handleEditUserRoleChange(value)}
                >
                  <SelectTrigger id="editRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
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
                  {/* RFID Card Number */}
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="editRfidCard">RFID Card</Label>
                    <Input
                      id="editRfidCard"
                      type="number"
                      placeholder="Enter RFID card number"
                      value={editUserForm.rfidCard || ""}
                      onChange={(e) =>
                        handleEditUserFormChange("rfidCard", e.target.value)
                      }
                    />
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
                        {availableDormitories.map((dormitory) => (
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
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="editStatus">Status</Label>
                <Select 
                  value={editUserForm.status} 
                  onValueChange={(value) => handleEditUserFormChange('status', value)}
                >
                  <SelectTrigger id="editStatus">
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
              {editUserError && (
                <div className="text-sm text-red-500 mt-2">{editUserError}</div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditUserModal}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser} disabled={editUserLoading}>
                {editUserLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Dialog open={deleteUserModalOpen} onOpenChange={setDeleteUserModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 border rounded-lg mb-4">
                <p><strong>Name:</strong> {userToDelete.firstName} {userToDelete.lastName}</p>
                <p><strong>Email:</strong> {userToDelete.email}</p>
                <p><strong>Role:</strong> {userToDelete.role}</p>
                {userToDelete.studentId && <p><strong>Student ID:</strong> {userToDelete.studentId}</p>}
              </div>
              <p className="text-sm text-gray-500">
                Deleting this user will remove all of their data from the system permanently.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDeleteUserModal}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteUser} 
                disabled={deleteUserLoading}
              >
                {deleteUserLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 