import { collection, query, where, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

// Student notification interface
export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  read: boolean;
  timestamp: string;
  action: string | null;
  userId: string;
}

// Manager notification interface
export interface ManagerNotification {
  id: string;
  type: 'approval' | 'occupancy' | 'system' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'normal' | 'low';
  userId: string;
}

// Admin notification interface
export interface AdminNotification {
  id: string;
  type: 'new_user' | 'room_assignment' | 'system' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'normal' | 'low';
  userId: string;
  relatedUserId?: string;
  relatedUserName?: string;
  relatedRoomId?: string;
  relatedRoomName?: string;
}

// Get all notifications for a student
export const getStudentNotifications = async (userId: string): Promise<StudentNotification[]> => {
  try {
    const notificationsRef = collection(db, 'studentNotifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StudentNotification));
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    return [];
  }
};

// Get all notifications for a manager
export const getManagerNotifications = async (userId: string): Promise<ManagerNotification[]> => {
  try {
    const notificationsRef = collection(db, 'managerNotifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ManagerNotification));
  } catch (error) {
    console.error('Error fetching manager notifications:', error);
    return [];
  }
};

// Mark notification as read (works for both student and manager)
export const markNotificationAsRead = async (
  notificationId: string,
  isStudent: boolean
): Promise<boolean> => {
  try {
    const collectionName = isStudent ? 'studentNotifications' : 'managerNotifications';
    const notificationRef = doc(db, collectionName, notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark notification as unread (works for both student and manager)
export const markNotificationAsUnread = async (
  notificationId: string,
  isStudent: boolean
): Promise<boolean> => {
  try {
    const collectionName = isStudent ? 'studentNotifications' : 'managerNotifications';
    const notificationRef = doc(db, collectionName, notificationId);
    await updateDoc(notificationRef, {
      read: false
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    return false;
  }
};

// Delete notification (works for both student and manager)
export const deleteNotification = async (
  notificationId: string,
  isStudent: boolean
): Promise<boolean> => {
  try {
    const collectionName = isStudent ? 'studentNotifications' : 'managerNotifications';
    const notificationRef = doc(db, collectionName, notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  userId: string,
  isStudent: boolean
): Promise<boolean> => {
  try {
    const collectionName = isStudent ? 'studentNotifications' : 'managerNotifications';
    const notificationsRef = collection(db, collectionName);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Create an array of promises for batch updates
    const updatePromises = querySnapshot.docs.map(document => 
      updateDoc(doc(db, collectionName, document.id), { read: true })
    );
    
    // Execute all updates in parallel
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}; 

// Get all notifications for an admin
export const getAdminNotifications = async (userId: string): Promise<AdminNotification[]> => {
  try {
    const notificationsRef = collection(db, 'adminNotifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AdminNotification));
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return [];
  }
};

// Create a notification for admin about new user registration
export const notifyAdminNewUserRegistration = async (
  adminUserId: string,
  newUserData: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string;
  }
): Promise<boolean> => {
  try {
    const fullName = `${newUserData.firstName} ${newUserData.lastName}`;
    const adminNotificationsRef = collection(db, 'adminNotifications');
    
    await addDoc(adminNotificationsRef, {
      type: 'new_user',
      title: 'New User Registration',
      message: `${fullName} (${newUserData.email}) has registered a new account.`,
      timestamp: serverTimestamp(),
      read: false,
      priority: 'normal',
      userId: adminUserId,
      relatedUserId: newUserData.userId,
      relatedUserName: fullName
    });
    
    return true;
  } catch (error) {
    console.error('Error creating admin notification for new user:', error);
    return false;
  }
};

// Create a notification for admin about room assignment
export const notifyAdminRoomAssignment = async (
  adminUserId: string,
  data: {
    studentId: string;
    studentName: string;
    roomId: string;
    roomName: string;
    building: string;
    assignedBy: string; // Manager's name
  }
): Promise<boolean> => {
  try {
    const adminNotificationsRef = collection(db, 'adminNotifications');
    
    await addDoc(adminNotificationsRef, {
      type: 'room_assignment',
      title: 'Room Assignment Completed',
      message: `${data.assignedBy} assigned Room ${data.roomName} in ${data.building} to ${data.studentName}.`,
      timestamp: serverTimestamp(),
      read: false,
      priority: 'normal',
      userId: adminUserId,
      relatedUserId: data.studentId,
      relatedUserName: data.studentName,
      relatedRoomId: data.roomId,
      relatedRoomName: data.roomName
    });
    
    return true;
  } catch (error) {
    console.error('Error creating admin notification for room assignment:', error);
    return false;
  }
};

// Get admin user IDs (utility function)
export const getAdminUserIds = async (): Promise<string[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'admin'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching admin user IDs:', error);
    return [];
  }
}; 