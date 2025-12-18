import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  deleteUser,

} from "@/app/utils/admin-firestore"
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface deleteModalProps {
  isOpen: boolean
  onClose: () => void
  delUser: User | null
}


export default function DeleteUserModal({ isOpen,onClose,delUser,}:deleteModalProps) {

  const [deleteUserModalOpen, setDeleteUserModalOpen] = useState(false)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  useEffect(() => {
    if (delUser && isOpen) {
      setUserToDelete({ ...delUser })
    }
  }, [delUser, isOpen])
  
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


      // Close modal and show success message
      onClose()
      toast.success("User deleted successfully")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.message || "Failed to delete user")
    } finally {
      setDeleteUserLoading(false)
    }
  }
      
  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
              onClick={onClose}
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
  )
}
