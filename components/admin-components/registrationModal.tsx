import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components//ui/label';
import { Input } from '@/components/ui/input';
import { getUsers, getDashboardStats, generateStudentId, generateManagerId, User, Room as AdminRoom, DashboardStats } from "@/app/utils/admin-firestore"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { toast } from 'sonner';

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
  
interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function RegistrationModal({isOpen,onClose}:RegisterModalProps) {
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
    const [users, setUsers] = useState<User[]>([])
      const [userRoleFilter, setUserRoleFilter] = useState('all')

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
    const handleRoleFilter = async (role: string) => {
      setUserRoleFilter(role)
      try {
        const filteredUsers = await getUsers(role)
        setUsers(filteredUsers)
      } catch (error) {
        console.error("Error filtering users:", error)
      }
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
          onClose
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
      // Close register modal
  const closeRegisterModal = () => {
    onClose()
    setRegisterError('')
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
  


  return (
     <Dialog open={isOpen} onOpenChange={onClose}>
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
  )
}
