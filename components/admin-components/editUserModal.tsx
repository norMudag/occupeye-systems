import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components//ui/label';
import { Input } from '@/components/ui/input';
import {
  getUsers,
  getDashboardStats,
  generateStudentId,
  generateManagerId,
  User,
  Room as AdminRoom,
  DashboardStats,
  getRooms,
  updateRoom,
  updateUser,

} from "@/app/utils/admin-firestore"
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
  
interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  editUser: User | null
}

export default function EditUserModal({  
  isOpen,
  onClose,
  editUser,
}:EditModalProps) {
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editUserForm, setEditUserForm] = useState<User | null>(null)
  const [editUserError, setEditUserError] = useState('')

      
useEffect(() => {
  if (editUser && isOpen) {
    setEditUserForm({ ...editUser })
  }
}, [editUser, isOpen])

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

      // Close modal and show success message
      onClose()
      toast.success("User updated successfully")
    } catch (error: any) {
      console.error("Error updating user:", error)
      setEditUserError(error.message || "Failed to update user")
    } finally {
      setEditUserLoading(false)
    }
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

  
  return (
     <Dialog open={isOpen} onOpenChange={onClose}>
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
              onClick={onClose}
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
)
}

