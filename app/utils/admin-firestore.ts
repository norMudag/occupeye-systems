import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// User data interface
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string; // Can be 'entry', 'exit', or 'active'
  rfidCard?: string | null;
  studentId?: string | null;
  managerId?: string | null;
  lastLogin?: string | null;
  createdAt: string;
  academicStatus?: string | null;
  managedBuildings?: string[] | null;
  assignedRoom?: string | null;
  assignedBuilding?: string | null;
  roomApplicationStatus?: string | null;
  roomApplicationId?: string | null;
  lastRoomApplication?: string | null;
}

// Room data interface (extended from student interface)
export interface Room {
  id: string;
  name: string;
  building: string;
  dormId?: string; // Reference to the dorm this room belongs to
  dormName?: string; // For convenience, store the dorm name
  capacity: number;
  status: string;
  rfidEnabled: boolean;
  availableRooms: number;
  currentOccupants: number;
  occupantIds?: string[]; // Array of user IDs who currently occupy this room
}

// Dorm data interface
export interface Dorm {
  id: string;
  name: string;
  description: string;
  location: string;
  managerIds: string[]; // Array of manager user IDs assigned to this dorm
  imageUrl?: string;
  capacity: number;
  status: string; // 'active', 'maintenance', 'inactive'
  roomCount: number;
  occupancyRate: number; // percentage of rooms occupied
  sex?: string | null; // 'Male', 'Female', 'Mixed', or null if not specified
}

// RFID log interface
export interface RfidLog {
  id: string;
  studentId: string;
  studentName: string;
  contactNumber:string;
  room: string;
  building?: string;
  dormId?: string;
  dormName?: string; // Add dormName field
  action: string;
  timestamp: string;
  duration?: string;
  status?: string;
  userId?: string;  // User ID field
  // User information fields
  assignedRoom?: string;
  assignedBuilding?: string;
  roomApplicationStatus?: string;
  // Fields directly from the log entry
  userAssignedRoom?: string | null;
  userAssignedBuilding?: string | null;
  userRoomApplicationStatus?: string | null;
}

// Dashboard stats interface
export interface DashboardStats {
  totalUsers: number;
  studentCount: number;
  staffCount: number;
  totalRooms: number;
  maintenanceRooms: number;
  activeRooms: number;
  rfidEventsToday: number;
  entriesCount: number;
  exitsCount: number;
  systemStatus: string;
}

// Get all users or filter by role
export const getUsers = async (role?: string): Promise<User[]> => {
  try {
    let usersQuery;
    if (role && role !== 'all') {
      usersQuery = query(collection(db, 'users'), where('role', '==', role));
    } else {
      usersQuery = collection(db, 'users');
    }
    
    const usersSnap = await getDocs(usersQuery);
    
    return usersSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        role: data.role || 'student',
        status: data.status || 'exit', // Default to 'exit' if not specified
        rfidCard: data.rfidCard,
        studentId: data.studentId,
        contactNumber:data.contactNumber,
        managerId: data.managerId,
        lastLogin: data.lastLogin,
        academicStatus: data.academicStatus || '',
        managedBuildings: data.managedBuildings || [],
        assignedRoom: data.assignedRoom || null,
        assignedBuilding: data.assignedBuilding || null,
        roomApplicationStatus: data.roomApplicationStatus || null,
        roomApplicationId: data.roomApplicationId || null,
        lastRoomApplication: data.lastRoomApplication instanceof Timestamp ? 
          data.lastRoomApplication.toDate().toISOString() : 
          data.lastRoomApplication,
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate().toISOString().split('T')[0] : 
          data.createdAt
      } as User;
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return { 
        id: userSnap.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        role: data.role || 'student',
        status: data.status || 'exit', // Default to 'exit' if not specified
        rfidCard: data.rfidCard,
        studentId: data.studentId,
        managerId: data.managerId,
        contactNumber:data.contactNumber,
        academicStatus: data.academicStatus || '',
        managedBuildings: data.managedBuildings || [],
        assignedRoom: data.assignedRoom || null,
        assignedBuilding: data.assignedBuilding || null,
        roomApplicationStatus: data.roomApplicationStatus || null,
        roomApplicationId: data.roomApplicationId || null,
        lastRoomApplication: data.lastRoomApplication instanceof Timestamp ? 
          data.lastRoomApplication.toDate().toISOString() : 
          data.lastRoomApplication,
        lastLogin: data.lastLogin,
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate().toISOString().split('T')[0] : 
          data.createdAt
      } as User;
    }
    return null;
  } catch (error) {
    console.error(`Error getting user with ID ${userId}:`, error);
    return null;
  }
};

// Update user
export const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
  try {
    // Convert undefined values to null before sending to Firestore
    const cleanedData: Record<string, any> = {};
    Object.entries(userData).forEach(([key, value]) => {
      cleanedData[key] = value === undefined ? null : value;
    });
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, cleanedData);
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    return false;
  }
};

// Delete user
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    return false;
  }
};

// Get all rooms
export const getRooms = async (building?: string): Promise<Room[]> => {
  try {
    let roomsQuery;
    if (building && building !== 'all') {
      roomsQuery = query(collection(db, 'rooms'), where('building', '==', building));
    } else {
      roomsQuery = collection(db, 'rooms');
    }
    
    const roomsSnap = await getDocs(roomsQuery);
    
    return roomsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        name: data.name || '',
        building: data.building || '',
        dormId: data.dormId || '',
        dormName: data.dormName || '',
        capacity: data.capacity || 0,
        status: data.status || 'available',
        rfidEnabled: data.rfidEnabled || false,
        availableRooms: data.availableRooms || 0,
        currentOccupants: data.currentOccupants || 0,
        occupantIds: data.occupantIds || [],
      } as Room;
    });
  } catch (error) {
    console.error("Error getting rooms:", error);
    return [];
  }
};

// Get room by ID
export const getRoomById = async (roomId: string): Promise<Room | null> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (roomSnap.exists()) {
      const data = roomSnap.data();
      return { 
        id: roomSnap.id,
        name: data.name || '',
        building: data.building || '',
        dormId: data.dormId || '',
        dormName: data.dormName || '',
        capacity: data.capacity || 0,
        status: data.status || 'available',
        rfidEnabled: data.rfidEnabled || false,
        availableRooms: data.availableRooms || 0,
        currentOccupants: data.currentOccupants || 0,
        occupantIds: data.occupantIds || [],
      } as Room;
    }
    return null;
  } catch (error) {
    console.error(`Error getting room with ID ${roomId}:`, error);
    return null;
  }
};

// Update room
export const updateRoom = async (roomId: string, roomData: Partial<Room>): Promise<boolean> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, roomData);
    return true;
  } catch (error) {
    console.error(`Error updating room ${roomId}:`, error);
    return false;
  }
};

// Create new room
export const createRoom = async (roomData: Partial<Room>): Promise<string | null> => {
  try {
    const roomsRef = collection(db, 'rooms');
    const docRef = await addDoc(roomsRef, roomData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating room:", error);
    return null;
  }
};

// Delete room
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    
    // Check if room exists before deleting
    const roomDoc = await getDoc(roomRef);
    if (!roomDoc.exists()) {
      throw new Error(`Room with ID ${roomId} not found`);
    }
    
    // Get room data to check if it's occupied
    const roomData = roomDoc.data();
    if (roomData.status === 'occupied' && roomData.currentOccupants > 0) {
      throw new Error('Cannot delete room with current occupants');
    }
    
    await deleteDoc(roomRef);
    console.log(`Room ${roomId} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting room ${roomId}:`, error);
    return false;
  }
};

// New function to get room stats for a dormitory
export const getDormRoomStats = async (dormId: string): Promise<{ roomCount: number, totalCapacity: number, occupancyRate: number }> => {
  try {
    // Query rooms with the given dormId
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('dormId', '==', dormId)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    
    if (roomsSnap.empty) {
      return {
        roomCount: 0,
        totalCapacity: 0,
        occupancyRate: 0
      };
    }
    
    let roomCount = 0;
    let totalCapacity = 0;
    let totalOccupants = 0;
    
    roomsSnap.forEach(doc => {
      roomCount++;
      const roomData = doc.data();
      totalCapacity += roomData.capacity || 0;
      totalOccupants += roomData.currentOccupants || 0;
    });
    
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupants / totalCapacity) * 100) : 0;
    
    return {
      roomCount,
      totalCapacity,
      occupancyRate
    };
  } catch (error) {
    console.error(`Error getting room stats for dorm ${dormId}:`, error);
    return {
      roomCount: 0,
      totalCapacity: 0,
      occupancyRate: 0
    };
  }
};

// Get all dorms with updated stats
export const getDorms = async (): Promise<Dorm[]> => {
  try {
    const dormsQuery = collection(db, 'dorms');
    const dormsSnap = await getDocs(dormsQuery);
    
    // Create an array to hold all the promises for room stats
    const dormPromises = dormsSnap.docs.map(async (dormDoc) => {
      const data = dormDoc.data();
      
      // Get room stats for this dorm
      const { roomCount, totalCapacity, occupancyRate } = await getDormRoomStats(dormDoc.id);
      
      // Return dorm with updated stats
      return { 
        id: dormDoc.id,
        name: data.name || '',
        description: data.description || '',
        location: data.location || '',
        managerIds: data.managerIds || [],
        imageUrl: data.imageUrl || '',
        capacity: totalCapacity, // Use calculated capacity from rooms
        status: data.status || 'active',
        roomCount: roomCount, // Use actual room count
        occupancyRate: occupancyRate, // Use calculated occupancy rate
        sex: data.sex || null, // Ensure sex field is fetched, default to null if not present
      } as Dorm;
    });
    
    // Resolve all promises to get complete dorms data
    return await Promise.all(dormPromises);
  } catch (error) {
    console.error("Error getting dorms:", error);
    return [];
  }
};

// Create new dorm
export const createDorm = async (dormData: Omit<Dorm, 'id'>): Promise<string | null> => {
  try {
    const dormsRef = collection(db, 'dorms');
    const docRef = await addDoc(dormsRef, dormData);
    const dormId = docRef.id;
    
    // Update manager accounts with the new dorm ID
    if (dormData.managerIds && dormData.managerIds.length > 0) {
      await updateManagersWithDormId(dormData.managerIds, dormId, 'add');
    }
    
    return dormId;
  } catch (error) {
    console.error("Error creating dorm:", error);
    return null;
  }
};

// Update dorm
export const updateDorm = async (dormId: string, dormData: Partial<Dorm>): Promise<boolean> => {
  try {
    const dormRef = doc(db, 'dorms', dormId);
    
    // If managerIds are being updated, handle manager assignments
    if (dormData.managerIds !== undefined) {
      // Get current dorm data to compare manager IDs
      const dormSnap = await getDoc(dormRef);
      if (dormSnap.exists()) {
        const currentDormData = dormSnap.data();
        const currentManagerIds = currentDormData.managerIds || [];
        const newManagerIds = dormData.managerIds || [];
        
        // Find managers to add (present in new list but not in current list)
        const managersToAdd = newManagerIds.filter((id: string) => !currentManagerIds.includes(id));
        
        // Find managers to remove (present in current list but not in new list)
        const managersToRemove = currentManagerIds.filter((id: string) => !newManagerIds.includes(id));
        
        // Update manager accounts
        if (managersToAdd.length > 0) {
          await updateManagersWithDormId(managersToAdd, dormId, 'add');
        }
        
        if (managersToRemove.length > 0) {
          await updateManagersWithDormId(managersToRemove, dormId, 'remove');
        }
      }
    }
    
    // Update the dorm document
    await updateDoc(dormRef, dormData);
    return true;
  } catch (error) {
    console.error(`Error updating dorm ${dormId}:`, error);
    return false;
  }
};

// Delete dorm
export const deleteDorm = async (dormId: string): Promise<boolean> => {
  try {
    // Check if dorm has any rooms
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('dormId', '==', dormId)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    
    if (!roomsSnap.empty) {
      throw new Error('Cannot delete dorm with existing rooms. Please delete all rooms first.');
    }
    
    // Get the dorm data to find manager IDs
    const dormRef = doc(db, 'dorms', dormId);
    const dormSnap = await getDoc(dormRef);
    
    if (dormSnap.exists()) {
      const dormData = dormSnap.data();
      const managerIds = dormData.managerIds || [];
      
      // Remove dormId from manager accounts
      if (managerIds.length > 0) {
        await updateManagersWithDormId(managerIds, dormId, 'remove');
      }
    }
    
    // Delete the dorm
    await deleteDoc(dormRef);
    return true;
  } catch (error) {
    console.error(`Error deleting dorm ${dormId}:`, error);
    return false;
  }
};

// Get dorm by ID with updated stats
export const getDormById = async (dormId: string): Promise<Dorm | null> => {
  try {
    const dormRef = doc(db, 'dorms', dormId);
    const dormSnap = await getDoc(dormRef);
    
    if (dormSnap.exists()) {
      const data = dormSnap.data();
      
      // Get room stats for this dorm
      const { roomCount, totalCapacity, occupancyRate } = await getDormRoomStats(dormId);
      
      return {
        id: dormSnap.id,
        name: data.name || '',
        description: data.description || '',
        location: data.location || '',
        managerIds: data.managerIds || [],
        imageUrl: data.imageUrl || '',
        capacity: totalCapacity, // Use calculated capacity from rooms
        status: data.status || 'active',
        roomCount: roomCount, // Use actual room count
        occupancyRate: occupancyRate, // Use calculated occupancy rate
        sex: data.sex || null, // Ensure sex field is fetched, default to null if not present
      } as Dorm;
    }
    return null;
  } catch (error) {
    console.error(`Error getting dorm ${dormId}:`, error);
    return null;
  }
};

// Get RFID logs with optional filtering
export const getRfidLogs = async (filters?: {
  studentId?: string;
  room?: string;
  action?: string;
  limit?: number;
  dormName?: string; // Add dormName filter
  contactNumber?:string
}): Promise<RfidLog[]> => {
  try {
    let logsQuery: any = collection(db, 'rfidLogs');
    
    // Apply filters if provided
    if (filters) {
      // Create an array to hold our conditions
      const conditions = [];
      
      if (filters.studentId) {
        conditions.push(where('studentId', '==', filters.studentId));
      }
      if (filters.room) {
        conditions.push(where('room', '==', filters.room));
      }
      if (filters.action) {
        conditions.push(where('action', '==', filters.action));
      }
      
      // Note: We can't directly filter by dormName in the query because
      // Firestore doesn't support OR conditions across fields
      // So we'll filter by dormName after fetching the data
      
      // Apply all conditions to the query
      if (conditions.length > 0) {
        logsQuery = query(logsQuery, ...conditions);
      }
      
      // Order by timestamp descending and apply limit
      logsQuery = query(logsQuery, orderBy('timestamp', 'desc'), limit(filters.limit || 100));
    } else {
      logsQuery = query(logsQuery, orderBy('timestamp', 'desc'), limit(100));
    }
    
    console.log("Executing RFID logs query...");
    const logsSnap = await getDocs(logsQuery);
    console.log(`Retrieved ${logsSnap.size} RFID logs from Firestore`);
    
    // Create a map to store user data
    const userDataMap: Record<string, any> = {};
    
    // Get all unique student IDs from the logs
    const studentIds = new Set<string>();
    logsSnap.docs.forEach(doc => {
      const data = doc.data() as { studentId?: string };
      if (data.studentId && data.studentId !== 'Unknown') {
        studentIds.add(data.studentId);
      }
    });
    
    // Fetch user data for all student IDs
    if (studentIds.size > 0) {
      // Firebase doesn't support 'where in' with more than 10 values
      // So we'll batch the requests if needed
      const batchSize = 10;
      const studentIdBatches: string[][] = [];
      
      let currentBatch: string[] = [];
      studentIds.forEach(id => {
        if (currentBatch.length >= batchSize) {
          studentIdBatches.push([...currentBatch]);
          currentBatch = [];
        }
        currentBatch.push(id);
      });
      
      if (currentBatch.length > 0) {
        studentIdBatches.push(currentBatch);
      }
      
      // Process each batch
      for (const batch of studentIdBatches) {
        const usersQuery = query(
          collection(db, 'users'),
          where('studentId', 'in', batch)
        );
        
        try {
          const usersSnap = await getDocs(usersQuery);
          usersSnap.docs.forEach(doc => {
            const userData = doc.data();
            if (userData.studentId) {
              userDataMap[userData.studentId] = userData;
            }
          });
        } catch (error) {
          console.error("Error fetching user data batch:", error);
        }
      }
      
      // Also try to fetch by user ID if studentId is actually a user ID
      for (const id of studentIds) {
        if (!userDataMap[id]) {
          try {
            const userDoc = doc(db, 'users', id);
            const userSnap = await getDoc(userDoc);
            if (userSnap.exists()) {
              userDataMap[id] = userSnap.data();
            }
          } catch (error) {
            console.error(`Error fetching user with ID ${id}:`, error);
          }
        }
      }
    }
    
    // Process logs and apply dormName filter if provided
    let logs = logsSnap.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      
      // Format timestamp properly for UTC+8 (Philippine time)
      let formattedTimestamp = '';
      if (data.timestamp instanceof Timestamp) {
        const utcDate = data.timestamp.toDate();
        const utcPlus8Date = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
        
        const year = utcPlus8Date.getUTCFullYear();
        const month = String(utcPlus8Date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(utcPlus8Date.getUTCDate()).padStart(2, '0');
        
        const hours = String(utcPlus8Date.getUTCHours()).padStart(2, '0');
        const minutes = String(utcPlus8Date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(utcPlus8Date.getUTCSeconds()).padStart(2, '0');
        
        formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      } else if (typeof data.timestamp === 'string') {
        formattedTimestamp = data.timestamp;
      } else {
        
        // Default to current time if timestamp is invalid
        const now = new Date();
        const utcPlus8Date = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        
        const year = utcPlus8Date.getUTCFullYear();
        const month = String(utcPlus8Date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(utcPlus8Date.getUTCDate()).padStart(2, '0');
        
        const hours = String(utcPlus8Date.getUTCHours()).padStart(2, '0');
        const minutes = String(utcPlus8Date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(utcPlus8Date.getUTCSeconds()).padStart(2, '0');
        
        formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      
      // Get user data if available
      const userData = userDataMap[data.studentId] || {};
      
      return { 
        id: doc.id,
        studentId: data.studentId || '',
        studentName: data.studentName || '',
        room: data.room || '',
        building: data.building,
        dormId: data.dormId || '',
        contactNumber:userData.contactNumber,
        dormName: data.dormName || '',
        action: data.action || '',
        timestamp: formattedTimestamp,
        duration: data.duration,
        status: data.status,
        userId: data.userId || null,
        // Add user information
        assignedRoom: userData.assignedRoom || '',
        assignedBuilding: userData.assignedBuilding || '',
        roomApplicationStatus: userData.roomApplicationStatus || '',
        // Fields directly from the log entry
        userAssignedRoom: data.userAssignedRoom || null,
        userAssignedBuilding: data.userAssignedBuilding || null,
        userRoomApplicationStatus: data.userRoomApplicationStatus || null
      } as RfidLog;
    });
    
    // Apply dormName filter if provided
    if (filters?.dormName) {
      const dormName = filters.dormName;
      console.log(`Filtering logs by dormName: ${dormName}`);
      logs = logs.filter(log => 
        (log.dormName && log.dormName === dormName) || 
        (log.building && log.building === dormName)
      );
      console.log(`Found ${logs.length} logs with dormName: ${dormName}`);
    }
    
    return logs;
  } catch (error) {
    console.error("Error getting RFID logs:", error);
    return [];
  }
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total users and count by role
    const usersQuery = collection(db, 'users');
    const usersSnap = await getDocs(usersQuery);
    
    let totalUsers = usersSnap.size;
    let studentCount = 0;
    let staffCount = 0;
    
    usersSnap.docs.forEach(doc => {
      const role = doc.data().role;
      if (role === 'student') {
        studentCount++;
      } else {
        staffCount++;
      }
    });
    
    // Get rooms data
    const roomsQuery = collection(db, 'rooms');
    const roomsSnap = await getDocs(roomsQuery);
    
    let totalRooms = roomsSnap.size;
    let maintenanceRooms = 0;
    let activeRooms = 0;
    
    roomsSnap.docs.forEach(doc => {
      const status = doc.data().status;
      if (status === 'maintenance') {
        maintenanceRooms++;
      } else {
        activeRooms++;
      }
    });
    
    // Get today's RFID events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const logsQuery = query(
      collection(db, 'rfidLogs'),
      where('timestamp', '>=', Timestamp.fromDate(today))
    );
    
    const logsSnap = await getDocs(logsQuery);
    
    let rfidEventsToday = logsSnap.size;
    let entriesCount = 0;
    let exitsCount = 0;
    
    logsSnap.docs.forEach(doc => {
      const action = doc.data().action;
      if (action === 'entry') {
        entriesCount++;
      } else if (action === 'exit') {
        exitsCount++;
      }
    });
    
    return {
      totalUsers,
      studentCount,
      staffCount,
      totalRooms,
      maintenanceRooms,
      activeRooms,
      rfidEventsToday,
      entriesCount,
      exitsCount,
      systemStatus: 'Optimal' // This could be dynamic based on other criteria
    };
  } catch (error) {
    console.error("Error calculating dashboard stats:", error);
    return {
      totalUsers: 0,
      studentCount: 0,
      staffCount: 0,
      totalRooms: 0,
      maintenanceRooms: 0,
      activeRooms: 0,
      rfidEventsToday: 0,
      entriesCount: 0,
      exitsCount: 0,
      systemStatus: 'Error'
    };
  }
};

// Generate a student ID based on the current year and count
export const generateStudentId = async (): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear().toString(); // Get full 4 digits of year
    
    // Get all student IDs from this year
    const studentQuery = query(
      collection(db, 'users'),
      where('studentId', '>=', `${currentYear}000`),
      where('studentId', '<', `${currentYear}999`),
      orderBy('studentId', 'desc'),
      limit(1) // Get only the highest one
    );
    
    const existingStudents = await getDocs(studentQuery);
    let nextSequence = 1; // Default to 1 if no students exist yet
    
    // If there are existing students, extract the highest sequence number and add 1
    if (!existingStudents.empty) {
      const highestId = existingStudents.docs[0].data().studentId;
      // Extract the numeric part after the year
      const sequencePart = highestId.substring(currentYear.length);
      nextSequence = parseInt(sequencePart, 10) + 1;
    }
    
    // Format: YYYY + 3 digit sequence (001, 002, etc.)
    // For example: 2023001, 2023002, etc. for year 2023
    const sequenceNumber = nextSequence.toString().padStart(3, '0');
    const newStudentId = `${currentYear}${sequenceNumber}`;
    
    return newStudentId;
  } catch (error) {
    console.error("Error generating student ID:", error);
    // Fallback: use timestamp as unique number
    const timestamp = Date.now().toString().slice(-3);
    const currentYear = new Date().getFullYear().toString();
    return `${currentYear}${timestamp}`;
  }
};

// Generate a manager ID (5 digits incremental)
export const generateManagerId = async (): Promise<string> => {
  try {
    // Get all manager IDs and find the highest one
    const managerQuery = query(
      collection(db, 'users'),
      where('role', '==', 'manager')
    );
    
    const managers = await getDocs(managerQuery);
    let highestId = 0;
    
    managers.forEach(managerDoc => {
      const data = managerDoc.data();
      if (data.managerId) {
        const idNumber = parseInt(data.managerId);
        if (!isNaN(idNumber) && idNumber > highestId) {
          highestId = idNumber;
        }
      }
    });
    
    // Next ID is one higher than the current highest
    const nextId = highestId + 1;
    
    // Format to 5 digits with leading zeros
    return nextId.toString().padStart(5, '0');
  } catch (error) {
    console.error("Error generating manager ID:", error);
    // Fallback: use timestamp as unique number
    return Date.now().toString().slice(-5);
  }
};

// Get multiple users by their IDs
export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
  try {
    if (!userIds || userIds.length === 0) return [];
    
    const uniqueUserIds = [...new Set(userIds)]; // Remove duplicates
    const users: User[] = [];
    
    // Firebase doesn't support "where in" with more than 10 values
    // So we need to batch the requests
    const batchSize = 10;
    const batches = [];
    
    // Create batches of 10 user IDs
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      batches.push(uniqueUserIds.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batch of batches) {
      const userDocs = await Promise.all(batch.map(id => getDoc(doc(db, 'users', id))));
      
      userDocs.forEach((userDoc, index) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          users.push({
            id: userDoc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            role: data.role || 'student',
            status: data.status || 'exit', // Default to 'exit' if not specified
            rfidCard: data.rfidCard,
            studentId: data.studentId,
            managerId: data.managerId,
            academicStatus: data.academicStatus || '',
            managedBuildings: data.managedBuildings || [],
            assignedRoom: data.assignedRoom || null,
            assignedBuilding: data.assignedBuilding || null,
            roomApplicationStatus: data.roomApplicationStatus || null,
            roomApplicationId: data.roomApplicationId || null,
            lastRoomApplication: data.lastRoomApplication instanceof Timestamp ? 
              data.lastRoomApplication.toDate().toISOString() : 
              data.lastRoomApplication,
            lastLogin: data.lastLogin,
            createdAt: data.createdAt instanceof Timestamp ? 
              data.createdAt.toDate().toISOString().split('T')[0] : 
              data.createdAt
          } as User);
        }
      });
    }
    
    return users;
  } catch (error) {
    console.error("Error getting users by IDs:", error);
    return [];
  }
};

// Get RFID activity data for charts
export const getRfidActivityData = async (timeRange: 'today' | 'week' | 'month' = 'today'): Promise<{
  hours: string[];
  entryData: number[];
  exitData: number[];
}> => {
  try {
    // Calculate the start date based on the time range
    const now = new Date();
    const startDate = new Date(now);
    
    if (timeRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Query RFID logs for the specified time range
    const firestoreStartDate = Timestamp.fromDate(startDate);
    
    const logsQuery = query(
      collection(db, 'rfidLogs'),
      where('timestamp', '>=', firestoreStartDate),
      orderBy('timestamp', 'asc')
    );
    
    const logsSnap = await getDocs(logsQuery);
    
    // Prepare data structures based on time range
    let hourLabels: string[] = [];
    let entryData: number[] = [];
    let exitData: number[] = [];
    
    if (timeRange === 'today') {
      // For today, use hourly data (24 hours)
      hourLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
      entryData = Array(24).fill(0);
      exitData = Array(24).fill(0);
      
      // Process logs
      logsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp instanceof Timestamp) {
          const date = data.timestamp.toDate();
          const hour = date.getHours();
          
          if (data.action === 'entry') {
            entryData[hour]++;
          } else if (data.action === 'exit') {
            exitData[hour]++;
          }
        }
      });
    } else if (timeRange === 'week') {
      // For week, use daily data (7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      hourLabels = days;
      entryData = Array(7).fill(0);
      exitData = Array(7).fill(0);
      
      // Process logs
      logsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp instanceof Timestamp) {
          const date = data.timestamp.toDate();
          const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
          
          if (data.action === 'entry') {
            entryData[dayIndex]++;
          } else if (data.action === 'exit') {
            exitData[dayIndex]++;
          }
        }
      });
    } else {
      // For month, use weekly data (4 weeks)
      hourLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      entryData = Array(4).fill(0);
      exitData = Array(4).fill(0);
      
      // Process logs
      logsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp instanceof Timestamp) {
          const date = data.timestamp.toDate();
          const dayOfMonth = date.getDate();
          let weekIndex = Math.floor((dayOfMonth - 1) / 7);
          if (weekIndex > 3) weekIndex = 3; // Cap at week 4
          
          if (data.action === 'entry') {
            entryData[weekIndex]++;
          } else if (data.action === 'exit') {
            exitData[weekIndex]++;
          }
        }
      });
    }
    
    return {
      hours: hourLabels,
      entryData,
      exitData
    };
  } catch (error) {
    console.error("Error getting RFID activity data:", error);
    return {
      hours: [],
      entryData: [],
      exitData: []
    };
  }
};

// Get rooms by dorm name
export const getRoomsByDormName = async (dormName: string): Promise<Room[]> => {
  try {
    const roomsQuery = query(collection(db, 'rooms'), where('dormName', '==', dormName));
    const roomsSnap = await getDocs(roomsQuery);
    
    return roomsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        name: data.name || '',
        building: data.building || '',
        dormId: data.dormId || '',
        dormName: data.dormName || '',
        capacity: data.capacity || 0,
        status: data.status || 'available',
        rfidEnabled: data.rfidEnabled || false,
        availableRooms: data.availableRooms || 0,
        currentOccupants: data.currentOccupants || 0,
        occupantIds: data.occupantIds || [],
      } as Room;
    });
  } catch (error) {
    console.error(`Error getting rooms for dorm ${dormName}:`, error);
    return [];
  }
};

// Update manager accounts with dormitory ID
export const updateManagersWithDormId = async (
  managerIds: string[],
  dormId: string,
  operation: 'add' | 'remove'
): Promise<boolean> => {
  try {
    // Process each manager in parallel
    const updatePromises = managerIds.map(async (managerId) => {
      const managerRef = doc(db, 'users', managerId);
      const managerDoc = await getDoc(managerRef);
      
      if (!managerDoc.exists()) {
        console.error(`Manager document ${managerId} not found`);
        return;
      }
      
      // Get current manager data
      const managerData = managerDoc.data();
      
      if (operation === 'add') {
        // Add dormId to manager's managedDormId field
        await updateDoc(managerRef, {
          managedDormId: dormId
        });
      } else if (operation === 'remove') {
        // Remove dormId from manager's managedDormId field
        // Only remove if the current managedDormId matches the one we're removing
        if (managerData.managedDormId === dormId) {
          await updateDoc(managerRef, {
            managedDormId: null
          });
        }
      }
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error("Error updating managers with dorm ID:", error);
    return false;
  }
};