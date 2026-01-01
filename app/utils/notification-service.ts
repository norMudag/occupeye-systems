import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StudentNotification, ManagerNotification } from './notification-firestore';

/**
 * Creates a notification for a student
 */
export const createStudentNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'success' | 'warning' | 'info',
  action: string | null = null
): Promise<string | null> => {
  try {
    const notificationsRef = collection(db, 'studentNotifications');
    
    const notificationData = {
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      action,
      userId
    };
    
    const docRef = await addDoc(notificationsRef, notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating student notification:', error);
    return null;
  }
};

/**
 * Creates a notification for a manager
 */
export const createManagerNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<string | null> => {
  try {
    const notificationsRef = collection(db, 'managerNotifications');
    
    const notificationData = {
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      priority,
      userId
    };
    
    const docRef = await addDoc(notificationsRef, notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating manager notification:', error);
    return null;
  }
};

/**
 * Creates notifications for all managers
 */
export const notifyAllManagers = async (
  title: string,
  message: string,
  type: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<boolean> => {
  try {
    // Get all users with manager role
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'manager'));
    const querySnapshot = await getDocs(q);
    
    const promises = querySnapshot.docs.map(doc => {
      const userId = doc.id;
      return createManagerNotification(userId, title, message, type, priority);
    });
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error notifying all managers:', error);
    return false;
  }
};

/**
 * Creates notifications for managers of a specific building
 */
export const notifyBuildingManagers = async (
  buildingName: string,
  title: string,
  message: string,
  type: 'approval' | 'occupancy' | 'system' | 'announcement',
  priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<boolean> => {
  try {
    // Get all managers who manage this building
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('role', '==', 'manager'),
      where('managedBuildings', 'array-contains', buildingName)
    );
    const querySnapshot = await getDocs(q);
    
    const promises = querySnapshot.docs.map(doc => {
      const userId = doc.id;
      return createManagerNotification(userId, title, message, type, priority);
    });
    
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error notifying building managers:', error);
    return false;
  }
};

/**
 * Creates a reservation request notification for managers
 */
export const createReservationRequestNotification = async (
  buildingName: string,
  roomName: string,
  studentName: string,
  reservationDate: string,
  reservationTime: string,
  reservationId: string
): Promise<boolean> => {
  try {
    const message = `${studentName} has requested ${roomName} in ${buildingName} for ${reservationDate} at ${reservationTime}. Requires your approval.`;
    
    return await notifyBuildingManagers(
      buildingName,
      'New Reservation Request',
      message,
      'approval',
      'high'
    );
  } catch (error) {
    console.error('Error creating reservation request notification:', error);
    return false;
  }
};

/**
 * Creates a reservation approval notification for a student
 */
export const notifyReservationApproved = async (
  studentId: string,
  roomName: string,
  buildingName: string,
  reservationDate: string,
  reservationTime: string,
  managerName: string
): Promise<string | null> => {
  try {
    const message = `Your reservation for ${roomName} (${buildingName}) on ${reservationDate} at ${reservationTime} has been approved by ${managerName}.`;
    
    return await createStudentNotification(
      studentId,
      'Reservation Approved',
      message,
      'success',
      'View Reservation'
    );
  } catch (error) {
    console.error('Error creating reservation approval notification:', error);
    return null;
  }
};

/**
 * Creates a reservation rejection notification for a student
 */
export const notifyReservationRejected = async (
  studentId: string,
  roomName: string,
  buildingName: string,
  reservationDate: string,
  reservationTime: string,
  managerName: string,
  reason: string
): Promise<string | null> => {
  try {
    const message = `Your reservation for ${roomName} (${buildingName}) on ${reservationDate} at ${reservationTime} has been rejected by ${managerName}. Reason: ${reason}`;
    
    return await createStudentNotification(
      studentId,
      'Reservation Rejected',
      message,
      'warning',
      'Book Another Room'
    );
  } catch (error) {
    console.error('Error creating reservation rejection notification:', error);
    return null;
  }
};

/**
 * Creates a room maintenance notification for managers
 */
export const notifyRoomMaintenance = async (
  buildingName: string,
  roomName: string,
  startDate: string,
  endDate: string,
  reason: string
): Promise<boolean> => {
  try {
    const message = `${roomName} in ${buildingName} is scheduled for maintenance from ${startDate} to ${endDate}. Reason: ${reason}`;
    
    return await notifyBuildingManagers(
      buildingName,
      'Room Maintenance Scheduled',
      message,
      'system',
      'normal'
    );
  } catch (error) {
    console.error('Error creating room maintenance notification:', error);
    return false;
  }
};

/**
 * Creates a high occupancy alert for managers
 */
export const notifyHighOccupancy = async (
  buildingName: string,
  occupancyPercentage: number
): Promise<boolean> => {
  try {
    const message = `${buildingName} has reached ${occupancyPercentage}% occupancy. Consider monitoring closely.`;
    
    return await notifyBuildingManagers(
      buildingName,
      'High Occupancy Alert',
      message,
      'occupancy',
      occupancyPercentage > 90 ? 'high' : 'normal'
    );
  } catch (error) {
    console.error('Error creating high occupancy notification:', error);
    return false;
  }
};

/**
 * Creates an RFID access notification for a student
 */
export const notifyRfidAccess = async (
  studentId: string,
  action: 'entry' | 'exit',
  roomName: string,
  buildingName: string
): Promise<string | null> => {
  try {
    const message = action === 'entry'
      ? `You have entered ${roomName} in ${buildingName} at ${new Date().toLocaleTimeString()}.`
      : `You have exited ${roomName} in ${buildingName} at ${new Date().toLocaleTimeString()}.`;
    
    return await createStudentNotification(
      studentId,
      `Room ${action === 'entry' ? 'Entry' : 'Exit'} Recorded`,
      message,
      'info',
      null
    );
  } catch (error) {
    console.error('Error creating RFID access notification:', error);
    return null;
  }
};

/**
 * Get the count of unread notifications for a user
 */
export const getUnreadNotificationCount = async (
  userId: string,
  isStudent: boolean
): Promise<number> => {
  try {
    const collectionName = isStudent ? 'studentNotifications' : 'managerNotifications';
    const notificationsRef = collection(db, collectionName);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}; 