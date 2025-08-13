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
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Room data interface
export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  status: string;
  description?: string;
  rfidEnabled?: boolean;
  currentOccupants?: number;
}

// Dormitory data interface
export interface Dormitory {
  building: string;
  totalRooms: number;
  availableRooms: number;
  occupancyRate: number;
}

// Reservation data interface
export interface Reservation {
  id: string;
  room: string;
  roomName: string;
  building: string;
  dormId?: string; // Reference to the dorm this reservation belongs to
  semester: string;
  status: string;
  purpose: string;
  createdAt: string;
  userId?: string;
  attendees?: number;
  notes?: string;
  managerId?: string;
  updatedAt?: string;
  fullName?: string;
}

// Occupancy record interface
export interface OccupancyRecord {
  date: string;
  room: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  userId?: string;
}

// Get all dormitories
export const getDormitories = async (): Promise<Dormitory[]> => {
  try {
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesSnap = await getDocs(dormitoriesRef);
    
    return dormitoriesSnap.docs.map(doc => {
      return { ...doc.data() } as Dormitory;
    });
  } catch (error) {
    console.error("Error getting dormitories:", error);
    return [];
  }
};

// Get all rooms or filter by building
export const getRooms = async (building?: string, status?: string): Promise<Room[]> => {
  try {
    let roomsQuery;
    
    if (building && building !== 'all' && status) {
      roomsQuery = query(
        collection(db, 'rooms'), 
        where('building', '==', building),
        where('status', '==', status)
      );
    } else if (building && building !== 'all') {
      roomsQuery = query(collection(db, 'rooms'), where('building', '==', building));
    } else if (status) {
      roomsQuery = query(collection(db, 'rooms'), where('status', '==', status));
    } else {
      roomsQuery = collection(db, 'rooms');
    }
    
    const roomsSnap = await getDocs(roomsQuery);
    
    return roomsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        ...data
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
      return { id: roomSnap.id, ...roomSnap.data() } as Room;
    }
    return null;
  } catch (error) {
    console.error(`Error getting room with ID ${roomId}:`, error);
    return null;
  }
};

// Get user reservations
export const getUserReservations = async (userId: string): Promise<Reservation[]> => {
  try {
    const reservationsQuery = query(
      collection(db, 'reservations'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    
    return reservationsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to string date if needed
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate().toISOString().split('T')[0] : 
          data.createdAt
      } as Reservation;
    });
  } catch (error) {
    console.error("Error getting user reservations:", error);
    return [];
  }
};

// Get reservation by ID
export const getReservationById = async (reservationId: string): Promise<Reservation | null> => {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationSnap = await getDoc(reservationRef);
    
    if (reservationSnap.exists()) {
      const data = reservationSnap.data();
      return { 
        id: reservationSnap.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? 
          data.createdAt.toDate().toISOString().split('T')[0] : 
          data.createdAt
      } as Reservation;
    }
    return null;
  } catch (error) {
    console.error(`Error getting reservation with ID ${reservationId}:`, error);
    return null;
  }
};

// Create new reservation
export const createReservation = async (reservationData: Omit<Reservation, 'id' | 'createdAt'>): Promise<string | null> => {
  try {
    const reservationRef = collection(db, 'reservations');
    const newReservation = {
      ...reservationData,
      createdAt: Timestamp.now()
    };
    
    // Create the reservation
    const docRef = await addDoc(reservationRef, newReservation);
    
    // Update the user document with room and building information
    if (reservationData.userId) {
      const userRef = doc(db, 'users', reservationData.userId);
      
      // Check if user document exists before updating
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          assignedRoom: reservationData.roomName,
          assignedBuilding: reservationData.building,
          roomApplicationStatus: reservationData.status,
          roomApplicationId: docRef.id,
          lastRoomApplication: Timestamp.now()
        });
      } else {
        console.warn(`User document with ID ${reservationData.userId} does not exist. Skipping user document update.`);
      }
    }
    
    // Update dormitory available slots by finding the dormitory that matches the building name
    // First get all dormitories
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesQuery = query(dormitoriesRef, where('building', '==', reservationData.building));
    const dormitoriesSnap = await getDocs(dormitoriesQuery);
    
    // If we found the dormitory, decrement its available rooms count
    if (!dormitoriesSnap.empty) {
      const dormitoryDoc = dormitoriesSnap.docs[0];
      const dormitoryData = dormitoryDoc.data() as Dormitory;
      
      if (dormitoryData.availableRooms > 0) {
        // Update the dormitory with one less available room
        await updateDoc(doc(db, 'dormitories', dormitoryDoc.id), {
          availableRooms: dormitoryData.availableRooms - 1
        });
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating reservation:", error);
    return null;
  }
};

// Update reservation status (for student cancellations)
export const updateReservationStatus = async (reservationId: string, status: 'cancelled'): Promise<boolean> => {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    
    // Get reservation data
    const reservationSnap = await getDoc(reservationRef);
    if (!reservationSnap.exists()) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    
    const reservationData = reservationSnap.data();
    const userId = reservationData.userId;
    const building = reservationData.building;
    
    // Get current timestamp
    const now = new Date();
    
    // Update reservation status
    await updateDoc(reservationRef, {
      status: status,
      updatedAt: now.toISOString()
    });
    
    // Update the user document with the cancelled status
    if (userId) {
      const userRef = doc(db, 'users', userId);
      
      // Check if user document exists before updating
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          roomApplicationStatus: status,
          lastUpdated: now.toISOString()
        });
      } else {
        console.warn(`User document with ID ${userId} does not exist. Skipping user document update.`);
      }
    }
    
    // Return available room to dormitory inventory
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesQuery = query(dormitoriesRef, where('building', '==', building));
    const dormitoriesSnap = await getDocs(dormitoriesQuery);
    
    if (!dormitoriesSnap.empty) {
      const dormitoryDoc = dormitoriesSnap.docs[0];
      const dormitoryData = dormitoryDoc.data();
      
      // Update the dormitory with one more available room
      await updateDoc(doc(db, 'dormitories', dormitoryDoc.id), {
        availableRooms: dormitoryData.availableRooms + 1
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating reservation ${reservationId}:`, error);
    return false;
  }
};

// Get user occupancy records
export const getUserOccupancyRecords = async (userId: string): Promise<OccupancyRecord[]> => {
  try {
    const recordsQuery = query(
      collection(db, 'occupancyRecords'),
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    const recordsSnap = await getDocs(recordsQuery);
    
    return recordsSnap.docs.map(doc => {
      return { ...doc.data() } as OccupancyRecord;
    });
  } catch (error) {
    console.error("Error getting occupancy records:", error);
    return [];
  }
};

// Calculate total hours used this month
export const getMonthlyHoursUsed = async (userId: string): Promise<number> => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const recordsQuery = query(
      collection(db, 'occupancyRecords'),
      where('userId', '==', userId),
      where('date', '>=', firstDay.toISOString().split('T')[0]),
      where('date', '<=', lastDay.toISOString().split('T')[0])
    );
    
    const recordsSnap = await getDocs(recordsQuery);
    
    // Sum up the duration of all records
    let totalHours = 0;
    recordsSnap.docs.forEach(doc => {
      const data = doc.data();
      // Assuming duration is stored as "2h 30m" format
      const durationStr = data.duration;
      const hoursMatch = durationStr.match(/(\d+)h/);
      const minutesMatch = durationStr.match(/(\d+)m/);
      
      const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
      
      totalHours += hours + (minutes / 60);
    });
    
    return parseFloat(totalHours.toFixed(1));
  } catch (error) {
    console.error("Error calculating monthly hours:", error);
    return 0;
  }
};

// Get count of reservations this month
export const getMonthlyReservationCount = async (userId: string): Promise<number> => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('userId', '==', userId),
      where('date', '>=', firstDay.toISOString().split('T')[0]),
      where('date', '<=', lastDay.toISOString().split('T')[0])
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    return reservationsSnap.size;
  } catch (error) {
    console.error("Error getting monthly reservation count:", error);
    return 0;
  }
};

// Get available dormitories based on actual room data
export const getAvailableDormitories = async (): Promise<Dormitory[]> => {
  try {
    // Instead of calculating from the rooms collection, directly fetch the dormitories collection
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesSnap = await getDocs(dormitoriesRef);
    
    if (dormitoriesSnap.empty) {
      // If no dormitories exist, fall back to the original implementation
      return calculateDormitoriesFromRooms();
    }
    
    // Convert the dormitory documents to the Dormitory interface
    const dormitories: Dormitory[] = dormitoriesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        building: data.building,
        totalRooms: data.totalRooms,
        availableRooms: data.availableRooms,
        occupancyRate: Math.round(((data.totalRooms - data.availableRooms) / data.totalRooms) * 100)
      } as Dormitory;
    });
    
    return dormitories;
  } catch (error) {
    console.error("Error getting available dormitories:", error);
    return [];
  }
};

// Helper function to calculate dormitories from rooms (used as fallback)
const calculateDormitoriesFromRooms = async (): Promise<Dormitory[]> => {
  try {
    // Get all rooms from Firestore
    const roomsRef = collection(db, 'rooms');
    const roomsSnap = await getDocs(roomsRef);
    const rooms = roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Room);
    
    // Group rooms by building
    const buildingMap = new Map<string, { total: number, available: number }>();
    
    rooms.forEach(room => {
      const building = room.building;
      
      if (!buildingMap.has(building)) {
        buildingMap.set(building, { total: 0, available: 0 });
      }
      
      const buildingData = buildingMap.get(building)!;
      buildingData.total += 1;
      
      if (room.status === 'available') {
        buildingData.available += 1;
      }
    });
    
    // Convert map to array of Dormitory objects
    const dormitories: Dormitory[] = [];
    buildingMap.forEach((data, building) => {
      const occupancyRate = Math.round(((data.total - data.available) / data.total) * 100);
      
      dormitories.push({
        building,
        totalRooms: data.total,
        availableRooms: data.available,
        occupancyRate
      });
    });
    
    return dormitories;
  } catch (error) {
    console.error("Error calculating dormitories from rooms:", error);
    return [];
  }
};

// Get academic years (real-time)
export const getAcademicYears = (callback: (years: string[]) => void): () => void => {
  try {
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Generate academic years (current year - 1 to current year + 3)
    const academicYears: string[] = [];
    for (let i = -1; i <= 3; i++) {
      academicYears.push(`${currentYear + i}-${currentYear + i + 1}`);
    }
    
    // Call the callback with the list of academic years
    callback(academicYears);
    
    // Return unsubscribe function
    return () => {
      // No cleanup needed for this implementation since we're not using Firestore listener
      // But we maintain the same API pattern for consistency
    };
  } catch (error) {
    console.error("Error getting academic years:", error);
    callback([]);
    return () => {};
  }
}; 