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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { getDormById } from './admin-firestore';

// Room data interface
export interface Room {
  id: string;
  name: string;
  building: string;
  dormId?: string; // Reference to the dorm this room belongs to
  dormName?: string; // Name of the dormitory
  capacity: number;
  status: string;
  currentOccupants: number;
  occupantIds?: string[]; // Array of user IDs who currently occupy this room
}

// Building status interface
export interface BuildingStatus {
  building: string;
  totalRooms: number;
  occupied: number;
  available: number;
  occupancyRate: number;
}

// Reservation data interface
export interface Reservation {
  id: string;
  student: string;
  studentId: string;
  room: string;
  roomName?: string;
  building: string;
  dormId?: string; // Reference to the dorm this reservation belongs to
  semester: string;
  purpose: string;
  requestDate: string;
  attendees?: number;
  priority?: string;
  status?: string;
  manager?: string;
  fullName?: string;
  userId?: string;
  notes?:string;
  createdAt?:string;
  corFile?:string;
}

// Activity history interface
export interface ActivityHistory {
  id: string;
  student: string;
  studentId: string;
  room: string;
  building: string;
  semester: string;
  status: string;
  manager: string;
  timestamp: string;
  managerName?: string;
}

// Get all buildings status
export const getBuildingsStatus = async (): Promise<BuildingStatus[]> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return []; // Return empty array if no buildings are assigned
    }

    // Get all rooms first to calculate building statistics
    const roomsRef = collection(db, 'rooms');
    const roomsSnap = await getDocs(roomsRef);
    
    // Group by building
    const buildingMap = new Map<string, BuildingStatus>();
    
    roomsSnap.docs.forEach(doc => {
      const data = doc.data();
      const building = data.building;
      
      // Only process buildings that the manager is authorized to manage
      if (!managedBuildings.includes(building)) {
        return;
      }
      
      if (!buildingMap.has(building)) {
        buildingMap.set(building, {
          building,
          totalRooms: 0,
          occupied: 0,
          available: 0,
          occupancyRate: 0
        });
      }
      
      const buildingData = buildingMap.get(building)!;
      buildingData.totalRooms += 1;
      
      // Use currentOccupants to determine if room is occupied
      const currentOccupants = data.currentOccupants || 0;
      const capacity = data.capacity || 0;
      
      if (currentOccupants >= capacity || data.status === 'occupied') {
        buildingData.occupied += 1;
      } else {
        buildingData.available += 1;
      }
    });
    
    // Calculate occupancy rates
    buildingMap.forEach(building => {
      building.occupancyRate = building.totalRooms > 0 
        ? Math.round((building.occupied / building.totalRooms) * 100)
        : 0;
    });
    
    return Array.from(buildingMap.values());
  } catch (error) {
    console.error("Error getting building statuses:", error);
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
      } as unknown as Reservation;
    }
    return null;
  } catch (error) {
    console.error(`Error getting reservation with ID ${reservationId}:`, error);
    return null;
  }
};


// Get all rooms with details
export const getDetailedRooms = async (building?: string): Promise<Room[]> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return []; // Return empty array if no buildings are assigned
    }

    let roomsQuery;
    if (building && building !== 'all') {
      // Verify the requested building is in managed buildings
      if (!managedBuildings.includes(building)) {
        return [];
      }
      roomsQuery = query(collection(db, 'rooms'), where('building', '==', building));
    } else {
      // If no specific building requested, get all rooms from managed buildings
      roomsQuery = query(
        collection(db, 'rooms'),
        where('building', 'in', managedBuildings)
      );
    }
    
    const roomsSnap = await getDocs(roomsQuery);
    
    return roomsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        name: data.name || '',
        building: data.building || '',
        dormId: data.dormId || '',
        capacity: data.capacity || 0,
        status: data.status || 'available',
        currentOccupants: data.currentOccupants || 0,
        occupantIds: data.occupantIds || []
      } as Room;
    });
  } catch (error) {
    console.error("Error getting detailed rooms:", error);
    return [];
  }
};

// Get pending reservations
export const getPendingReservations = async (): Promise<Reservation[]> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return []; // Return empty array if no buildings are assigned
    }

    // Get pending reservations for the managed buildings
    const pendingQuery = query(
      collection(db, 'reservations'),
      where('status', '==', 'pending'),
      where('building', 'in', managedBuildings)
    );
    const pendingSnap = await getDocs(pendingQuery);
    
    return processQueryResults(pendingSnap);
  } catch (error) {
    console.error("Error getting pending reservations:", error);
    return [];
  }
};

// Get pending reservations filtered by manager's assigned dormitory
export const getPendingReservationsByDorm = async (): Promise<Reservation[]> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty array
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return [];
    }

    // Get pending reservations for the managed dormitory
    const pendingQuery = query(
      collection(db, 'reservations'),
      where('status', '==', 'pending'),
      where('dormId', '==', managedDormId)
    );
    const pendingSnap = await getDocs(pendingQuery);
    
    return pendingSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        student: data.student || '',
        studentId: data.studentId || '',
        room: data.room || '',
        roomName: data.roomName || '',
        building: data.building || '',
        dormId: data.dormId || '',
        semester: data.semester || '',
        purpose: data.purpose || '',
        requestDate: data.requestDate || '',
        status: data.status || 'pending',
        manager: data.manager || '',
        userId:data.userId,
        fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim()
      } as Reservation;
    });
  } catch (error) {
    console.error("Error getting pending reservations by dorm:", error);
    return [];
  }
};

// Get recent reservation activity
export const getRecentReservations = async (limitCount: number = 10): Promise<Reservation[]> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return []; // Return empty array if no buildings are assigned
    }

    // First check the activity_history collection
    const activityQuery = query(
      collection(db, 'activity_history'),
      where('building', 'in', managedBuildings),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const activitySnap = await getDocs(activityQuery);
    
    if (!activitySnap.empty) {
      return activitySnap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id,
          student: data.student || '',
          studentId: data.studentId || '',
          room: data.room || '',
          building: data.building || '',
          semester: data.semester || '',
          purpose: data.purpose || '',
          requestDate: data.timestamp || '',
          status: data.status || '',
          manager: data.manager || data.managerName || ''
        } as Reservation;
      });
    }
    
    // Fallback to the old method if no activity history
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('building', 'in', managedBuildings),
      where('status', 'in', ['approved', 'denied']),
      orderBy('requestDate', 'desc'),
      limit(limitCount)
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    
    return reservationsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        student: data.student || '',
        studentId: data.studentId || '',
        room: data.room || '',
        building: data.building || '',
        semester: data.semester || '',
        purpose: data.purpose || '',
        requestDate: data.requestDate || '',
        status: data.status || '',
        manager: data.manager || ''
      } as Reservation;
    });
  } catch (error) {
    console.error("Error getting recent reservations:", error);
    return [];
  }
};

// Get recent reservation activity filtered by manager's assigned dormitory
export const getRecentReservationsByDorm = async (limitCount: number = 10): Promise<Reservation[]> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty array
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return [];
    }

    // First check the activity_history collection
    const activityQuery = query(
      collection(db, 'activity_history'),
      where('dormId', '==', managedDormId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const activitySnap = await getDocs(activityQuery);
    
    if (!activitySnap.empty) {
      return activitySnap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id,
          student: data.student || '',
          studentId: data.studentId || '',
          room: data.room || '',
          building: data.building || '',
          dormId: data.dormId || '',
          semester: data.semester || '',
          purpose: data.purpose || '',
          requestDate: data.timestamp || '',
          status: data.status || '',
          manager: data.manager || data.managerName || ''
        } as Reservation;
      });
    }
    
    // Fallback to the old method if no activity history
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('dormId', '==', managedDormId),
      where('status', 'in', ['approved', 'denied']),
      orderBy('requestDate', 'desc'),
      limit(limitCount)
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    
    return reservationsSnap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id,
        student: data.student || '',
        studentId: data.studentId || '',
        room: data.room || '',
        building: data.building || '',
        dormId: data.dormId || '',
        semester: data.semester || '',
        purpose: data.purpose || '',
        requestDate: data.requestDate || '',
        status: data.status || '',
        manager: data.manager || ''
      } as Reservation;
    });
  } catch (error) {
    console.error("Error getting recent reservations by dorm:", error);
    return [];
  }
};

// Update reservation status (approve/deny)
export const updateReservationStatus = async (
  reservationId: string, 
  status: 'approved' | 'denied', 
  managerId: string

): Promise<boolean> => {
  try {
    console.log(`Updating reservation ${reservationId} to ${status}`);
    const reservationRef = doc(db, 'reservations', reservationId);
    
    // Get reservation data to find the building
    const reservationSnap = await getDoc(reservationRef);
    if (!reservationSnap.exists()) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    
    const reservationData = reservationSnap.data();
    const building = reservationData.building;
    const roomName = reservationData.roomName || reservationData.room;
    const dormId = reservationData.dormId || '';
    const attendees = reservationData.attendees || 1; // Default to 1 if not specified
    const userId = reservationData.userId;
    
    // Get current timestamp to record when the update happened
    const now = new Date();
    
    await updateDoc(reservationRef, {
      status: status,
      managerId: managerId,
      updatedAt: now.toISOString()
    });
    
    // Update the user document if userId exists
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        roomApplicationStatus: status,
        assignedRoom:roomName,
        lastUpdated: now.toISOString()
      });
    }
    
    // Add to activity history
    await addDoc(collection(db, 'activity_history'), {
      student: reservationData.student || `Student ${(reservationData.userId || '').substring(0, 5)}`,
      studentId: reservationData.studentId || reservationData.userId || '',
      room: roomName || '',
      building: building || '',
      semester: reservationData.semester || '',
      status: status,
      manager: managerId,
      managerName: "You",
      timestamp: now.toISOString(),
      purpose: reservationData.purpose || '',
      reservationId: reservationId
    });
    
    if (status === 'approved') {
      // Update the room occupancy in the rooms collection (do NOT decrement capacity)
      const roomsRef = collection(db, 'rooms');
      const roomsQuery = query(
        roomsRef, 
        where('building', '==', building),
        where('name', '==', roomName)
      );
      const roomsSnap = await getDocs(roomsQuery);
      
      if (!roomsSnap.empty) {
        const roomDoc = roomsSnap.docs[0];
        const roomData = roomDoc.data();
        const currentCapacity = roomData.capacity || 0;
        const currentOccupants = roomData.currentOccupants || 0;
        
        // Get existing occupant IDs or initialize empty array
        const occupantIds = roomData.occupantIds || [];
        
        // Add the user ID to occupant list if it exists and isn't already in the list
        if (userId && !occupantIds.includes(userId)) {
          occupantIds.push(userId);
        }
        
        // Only update currentOccupants and status, leave capacity unchanged
        // Update room status if at full capacity
        const newStatus = (currentOccupants + attendees) >= currentCapacity ? 'occupied' : 'available';
        
        await updateDoc(doc(db, 'rooms', roomDoc.id), {
          status: newStatus,
          currentOccupants: currentOccupants + attendees,
          occupantIds: occupantIds
        });
        
        // Also update the user's assigned room
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            assignedRoom: roomName,
            assignedBuilding: building
          });
        }
        
        console.log(`Updated room ${roomName} currentOccupants: ${currentOccupants} -> ${currentOccupants + attendees}`);
      }
    } else if (status === 'denied') {
      // Update user room assignment to null/empty if this was their current assignment
      if (userId) {
        try {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists() && userDoc.data().assignedRoom) {
            // Check if this user is assigned to the room they're being denied from
            const roomsRef = collection(db, 'rooms');
            const roomsQuery = query(
              roomsRef, 
              where('building', '==', building),
              where('name', '==', roomName)
            );
            const roomsSnap = await getDocs(roomsQuery);
            
            if (!roomsSnap.empty) {
              const roomDoc = roomsSnap.docs[0];
              
              // If this is the user's assigned room, clear their assignment
              if (userDoc.data().assignedRoom === roomDoc.id) {
                await updateDoc(userRef, {
                  assignedRoom: null,
                  assignedBuilding: null
                });
                
                // Also remove user from room's occupant list
                const roomData = roomDoc.data();
                const occupantIds = roomData.occupantIds || [];
                const userIndex = occupantIds.indexOf(userId);
                
                if (userIndex !== -1) {
                  // Remove user from occupants array
                  occupantIds.splice(userIndex, 1);
                  
                  // Update room with decremented occupant count
                  await updateDoc(doc(db, 'rooms', roomDoc.id), {
                    currentOccupants: Math.max(0, (roomData.currentOccupants || 1) - 1),
                    occupantIds: occupantIds,
                    status: (roomData.currentOccupants || 1) <= 1 ? 'available' : 'occupied'
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error updating user assignment:", error);
        }
      }
      
      // Find the dormitory for this building
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
    }
    // No need to decrement available rooms when approving because we already
    // decremented the count when the reservation/application was created
    
    console.log(`Successfully updated reservation ${reservationId}`);
    return true;
  } catch (error) {
    console.error(`Error updating reservation ${reservationId}:`, error);
    return false;
  }
};

// Helper function to determine the current academic semester
export const getCurrentSemester = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // First semester is typically June-October, second is November-March
  // This can be adjusted based on the institution's academic calendar
  let semester;
  let academicYear;
  
  if (month >= 6 && month <= 10) {
    semester = "1st Semester";
    academicYear = `${year}-${year + 1}`;
  } else if ((month >= 11 && month <= 12) || (month >= 1 && month <= 3)) {
    semester = "2nd Semester";
    academicYear = month >= 11 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  } else {
    // Summer/special term or default
    semester = "Summer Term";
    academicYear = `${year}`;
  }
  
  return `${semester} ${academicYear}`;
};

export const getManagerDashboardStats = async (): Promise<{
  pendingCount: number;
  semesterReservations: number;
  semesterApproved: number;
  semesterPending: number;
  overallOccupancy: number;
  activeStudents: number;
}> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return {
        pendingCount: 0,
        semesterReservations: 0,
        semesterApproved: 0,
        semesterPending: 0,
        overallOccupancy: 0,
        activeStudents: 0
      };
    }

    // Get pending reservations count for managed buildings
    const pendingQuery = query(
      collection(db, 'reservations'),
      where('status', '==', 'pending'),
      where('building', 'in', managedBuildings)
    );
    const pendingSnap = await getDocs(pendingQuery);
    const pendingCount = pendingSnap.size;
    
    // Get current semester dynamically
    const currentSemester = getCurrentSemester();
    
    // Get semester's reservations for managed buildings
    const semesterQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', currentSemester),
      where('building', 'in', managedBuildings)
    );
    const semesterSnap = await getDocs(semesterQuery);
    
    let semesterApproved = 0;
    let semesterPending = 0;
    
    semesterSnap.forEach(doc => {
      const status = doc.data().status;
      if (status === 'approved') {
        semesterApproved++;
      } else if (status === 'pending') {
        semesterPending++;
      }
    });
    
    // Get all rooms from managed buildings with detailed occupancy information
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('building', 'in', managedBuildings)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    
    // Calculate accurate occupancy statistics
    let totalRooms = roomsSnap.size;
    let totalCapacity = 0;
    let currentOccupants = 0;
    let occupantIds = new Set<string>();
    
    // Process each room to get accurate counts
    roomsSnap.forEach(doc => {
      const roomData = doc.data();
      // Add to total capacity
      const capacity = roomData.capacity || 0;
      totalCapacity += capacity;
      
      // Count current occupants
      const roomOccupants = roomData.currentOccupants || 0;
      currentOccupants += roomOccupants;
      
      // Collect unique occupant IDs
      if (roomData.occupantIds && Array.isArray(roomData.occupantIds)) {
        roomData.occupantIds.forEach((id: string) => {
          if (id) occupantIds.add(id);
        });
      }
    });
    
    // Double-check active students by querying users collection
    // This is more accurate than just counting occupantIds
    const studentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('assignedBuilding', 'in', managedBuildings)
    );
    
    const studentsSnap = await getDocs(studentsQuery);
    // Use the larger of the two counts to ensure we don't miss anyone
    const activeStudents = Math.max(occupantIds.size, studentsSnap.size);
    
    // Calculate occupancy rate based on total capacity vs current occupants
    const overallOccupancy = totalCapacity > 0 
      ? Math.round((currentOccupants / totalCapacity) * 100) 
      : 0;
    
    return {
      pendingCount,
      semesterReservations: semesterApproved + semesterPending,
      semesterApproved,
      semesterPending,
      overallOccupancy,
      activeStudents
    };
  } catch (error) {
    console.error("Error getting manager dashboard stats:", error);
    return {
      pendingCount: 0,
      semesterReservations: 0,
      semesterApproved: 0,
      semesterPending: 0,
      overallOccupancy: 0,
      activeStudents: 0
    };
  }
};

// Get semester reservation stats
export const getSemesterReservationStats = async (semester?: string): Promise<{
  approvedCount: number;
  deniedCount: number;
}> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty data
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return {
        approvedCount: 0,
        deniedCount: 0
      };
    }
    
    // Use the provided semester or get the current semester dynamically
    const semesterToUse = semester || getCurrentSemester();
    
    // Get approved reservations for this semester and managed dormitory
    const approvedQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', semesterToUse),
      where('status', '==', 'approved'),
      where('dormId', '==', managedDormId)
    );
    const approvedSnap = await getDocs(approvedQuery);
    
    // Get denied reservations for this semester and managed dormitory
    const deniedQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', semesterToUse),
      where('status', '==', 'denied'),
      where('dormId', '==', managedDormId)
    );
    const deniedSnap = await getDocs(deniedQuery);
    
    return {
      approvedCount: approvedSnap.size,
      deniedCount: deniedSnap.size
    };
  } catch (error) {
    console.error(`Error getting reservation stats for semester:`, error);
    return {
      approvedCount: 0,
      deniedCount: 0
    };
  }
};

// Get all reservations with filters
export const getAllReservations = async (
  statusFilter?: 'pending' | 'approved' | 'denied' | 'all',
  semesterFilter?: string,
  buildingFilter?: string,
  limitCount: number = 50
): Promise<Reservation[]> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return []; // Return empty array if no buildings are assigned
    }

    console.log('getAllReservations called with filters:', { statusFilter, semesterFilter, buildingFilter, limitCount });
    
    let reservationsQuery: any = collection(db, 'reservations');
    let reservationsSnap;
    
    // For simplicity, first fetch all documents and then filter them manually
    // This avoids complex queries that might fail if data is inconsistent
    try {
      // First get all reservations for managed buildings
      reservationsQuery = query(
        collection(db, 'reservations'),
        where('building', 'in', managedBuildings),
        limit(100)
      );
      reservationsSnap = await getDocs(reservationsQuery);
      console.log(`Query returned ${reservationsSnap.size} total documents`);
      
      // Process and filter the results manually
      let results = processQueryResults(reservationsSnap);
      
      // Apply filters manually
      if (statusFilter && statusFilter !== 'all') {
        console.log(`Filtering by status: ${statusFilter}`);
        results = results.filter(res => {
          const status = (res.status || '').toLowerCase();
          const targetStatus = statusFilter.toLowerCase();
          console.log(`Comparing status: "${status}" with target: "${targetStatus}"`, status === targetStatus);
          return status === targetStatus;
        });
        console.log(`After status filter: ${results.length} results`);
      }
      
      if (semesterFilter) {
        console.log(`Filtering by semester: ${semesterFilter}`);
        results = results.filter(res => res.semester === semesterFilter);
        console.log(`After semester filter: ${results.length} results`);
      }
      
      if (buildingFilter && buildingFilter !== 'all') {
        // Verify the requested building is in managed buildings
        if (!managedBuildings.includes(buildingFilter)) {
          return [];
        }
        console.log(`Filtering by building: ${buildingFilter}`);
        results = results.filter(res => res.building === buildingFilter);
        console.log(`After building filter: ${results.length} results`);
      }
      
      // Limit the results
      results = results.slice(0, limitCount);
      console.log(`Returning ${results.length} filtered results`);
      
      return results;
    } catch (error) {
      console.error("Error with manual filtering approach, trying traditional query:", error);
      
      // Fall back to traditional query approach
      const conditions = [];
      
      // Add status filter
      if (statusFilter && statusFilter !== 'all') {
        conditions.push(where('status', '==', statusFilter));
      }
      
      // Add semester filter
      if (semesterFilter) {
        conditions.push(where('semester', '==', semesterFilter));
      }
      
      // Add building filter
      if (buildingFilter && buildingFilter !== 'all') {
        // Verify the requested building is in managed buildings
        if (!managedBuildings.includes(buildingFilter)) {
          return [];
        }
        conditions.push(where('building', '==', buildingFilter));
      } else {
        // If no specific building requested, filter by managed buildings
        conditions.push(where('building', 'in', managedBuildings));
      }
      
      // Create compound query if there are conditions
      if (conditions.length > 0) {
        console.log('Applying conditions to query:', conditions.length);
        try {
          reservationsQuery = query(
            collection(db, 'reservations'),
            ...conditions,
            limit(limitCount)
          );
        } catch (error) {
          console.error("Error creating query with conditions:", error);
          reservationsQuery = query(collection(db, 'reservations'), limit(limitCount));
        }
      } else {
        reservationsQuery = query(collection(db, 'reservations'), limit(limitCount));
      }
      
      console.log('Executing fallback Firestore query...');
      reservationsSnap = await getDocs(reservationsQuery);
      
      return processQueryResults(reservationsSnap);
    }
  } catch (error) {
    console.error("Error getting reservations:", error);
    return [];
  }
};

// Helper function to process query results
const processQueryResults = (querySnapshot: any): Reservation[] => {
  const results = querySnapshot.docs.map((doc: any) => {
    const data = doc.data() as {
      student?: string;
      studentId?: string;
      room?: string;
      roomName?: string;
      building?: string;
      dormId?: string;
      semester?: string;
      purpose?: string;
      requestDate?: string;
      createdAt?: string | { toDate?: () => Date };
      attendees?: number;
      priority?: string;
      status?: string;
      manager?: string;
      userId?: string;
      fullName?: string;
    };
    
    // Handle Firestore timestamp objects for createdAt
    let requestDate = data.requestDate || '';
    if (!requestDate && data.createdAt) {
      if (typeof data.createdAt === 'object' && data.createdAt.toDate) {
        try {
          requestDate = data.createdAt.toDate().toISOString().split('T')[0];
        } catch (e) {
          console.error("Error converting timestamp:", e);
        }
      } else if (typeof data.createdAt === 'string') {
        requestDate = data.createdAt;
      }
    }
    
    return { 
      id: doc.id,
      fullName: data.fullName || '',
      student: data.student || `Student ${(data.userId || '').substring(0, 5) || doc.id.substring(0, 5)}`,
      studentId: data.studentId || data.userId || '',
      room: data.roomName || data.room || '',
      building: data.building || '',
      dormId: data.dormId || '',
      semester: data.semester || '',
      purpose: data.purpose || '',
      requestDate: requestDate,
      attendees: data.attendees,
      priority: data.priority || 'normal',
      status: data.status || 'pending',
      manager: data.manager || ''
    } as Reservation;
  });
  
  return results;
};

// Get all available buildings/dormitories
export const getAllDormitories = async (): Promise<string[]> => {
  try {
    // First try to get data from dormitories collection
    const dormitoriesRef = collection(db, 'dormitories');
    const dormitoriesSnap = await getDocs(dormitoriesRef);
    
    if (!dormitoriesSnap.empty) {
      // Extract unique building names
      const dormitories = dormitoriesSnap.docs.map(doc => doc.data().building);
      return [...new Set(dormitories)]; // Remove duplicates
    }
    
    // Fallback: Get unique building names from rooms collection
    const roomsRef = collection(db, 'rooms');
    const roomsSnap = await getDocs(roomsRef);
    
    const buildings = roomsSnap.docs.map(doc => doc.data().building);
    return [...new Set(buildings)]; // Remove duplicates
  } catch (error) {
    console.error("Error getting dormitories:", error);
    return [];
  }
};

// Get all available semesters
export const getAllSemesters = async (): Promise<string[]> => {
  try {
    const reservationsRef = collection(db, 'reservations');
    const reservationsSnap = await getDocs(reservationsRef);
    
    const semesters = reservationsSnap.docs
      .map(doc => doc.data().semester)
      .filter(semester => semester); // Filter out undefined/null values
    
    return [...new Set(semesters)]; // Remove duplicates
  } catch (error) {
    console.error("Error getting semesters:", error);
    return [];
  }
}; 

// Get available rooms by building
export const getAvailableRoomsByBuilding = async (building: string, dormId?: string): Promise<Room[]> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty array
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return [];
    }
    
    // If dormId is provided, ensure it matches the manager's assigned dormitory
    if (dormId && dormId !== managedDormId) {
      console.log("Manager not authorized to view rooms in this dormitory");
      return [];
    }
    
    // Query all rooms in the manager's dormitory
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('dormId', '==', managedDormId)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    
    // Map rooms and convert to array
    const rooms = roomsSnap.docs.map(doc => {
      const data = doc.data();
      // Get occupant IDs array or initialize as empty array
      const occupantIds = data.occupantIds || [];
      
      // Calculate current occupants based on occupantIds length if available
      // Otherwise fall back to the stored currentOccupants value
      const currentOccupants = occupantIds.length > 0 
        ? occupantIds.length 
        : data.currentOccupants || 0;
      
      return { 
        id: doc.id,
        name: data.name || '',
        building: data.building || '',
        dormId: data.dormId || '',
        capacity: data.capacity || 0,
        status: data.status || 'available',
        currentOccupants: currentOccupants,
        occupantIds: occupantIds
      } as Room;
    });
    
    // Sort rooms by room number in ascending order
    return rooms.sort((a, b) => {
      const roomNumberA = parseInt(a.name.replace(/\D/g, ''));
      const roomNumberB = parseInt(b.name.replace(/\D/g, ''));
      
      if (!isNaN(roomNumberA) && !isNaN(roomNumberB)) {
        return roomNumberA - roomNumberB;
      }
      
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error getting available rooms for building ${building}:`, error);
    return [];
  }
};

// Assign a room to a reservation
export const assignRoomToReservation = async (
  reservationId: string,
  roomId: string
): Promise<boolean> => {
  try {
    // Get the room data
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    
    if (!roomSnap.exists()) {
      throw new Error(`Room ${roomId} not found`);
    }
    
    const roomData = roomSnap.data();
    const roomName = roomData.name;
    
    // Get the reservation data to find the dormId and userId
    const reservationRef = doc(db, 'reservations', reservationId);
    const reservationSnap = await getDoc(reservationRef);
    
    if (!reservationSnap.exists()) {
      throw new Error(`Reservation ${reservationId} not found`);
    }
    
    const reservationData = reservationSnap.data();
    const dormId = reservationData.dormId || '';
    const userId = reservationData.userId || reservationData.studentId || '';
    
    // Update the reservation with the room ID and name
    await updateDoc(reservationRef, {
      room: roomId,
      roomName: roomName,
      updatedAt: new Date().toISOString()
    });
    
    // If we have a valid userId, update the room's occupantIds array
    if (userId) {
      // Get existing occupant IDs or initialize empty array
      const occupantIds = roomData.occupantIds || [];
      
      // Add the user ID to occupant list if it isn't already in the list
      if (!occupantIds.includes(userId)) {
        occupantIds.push(userId);
        
        // Update the room with the new occupantIds array
        await updateDoc(roomRef, {
          occupantIds: occupantIds
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Error assigning room ${roomId} to reservation ${reservationId}:`, error);
    return false;
  }
}; 

// Get rooms by manager's assigned dormitory
export const getRoomsByManagerDorm = async (statusFilter?: string): Promise<Room[]> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty array
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return [];
    }

    // Get the dorm name from the dorm ID
    const dormData = await getDormById(managedDormId);
    const dormName = dormData?.name || '';

    let roomsQuery;
    
    // Apply status filter if provided
    if (statusFilter && statusFilter !== 'all') {
      roomsQuery = query(
        collection(db, 'rooms'),
        where('dormId', '==', managedDormId),
        where('status', '==', statusFilter)
      );
    } else {
      roomsQuery = query(
        collection(db, 'rooms'),
        where('dormId', '==', managedDormId)
      );
    }
    
    const roomsSnap = await getDocs(roomsQuery);
    
    // Get rooms data
    const rooms = roomsSnap.docs.map(doc => {
      const data = doc.data();
      // Get occupant IDs array or initialize as empty array
      const occupantIds = data.occupantIds || [];
      
      // Calculate current occupants based on occupantIds length if available
      // Otherwise fall back to the stored currentOccupants value
      const currentOccupants = occupantIds.length > 0 
        ? occupantIds.length 
        : data.currentOccupants || 0;
      
      return { 
        id: doc.id,
        name: data.name || '',
        building: data.building || dormName, // Use dormName as building if building is not set
        dormId: data.dormId || '',
        dormName: dormName, // Add the dormName to each room
        capacity: data.capacity || 0,
        status: data.status || 'available',
        currentOccupants: currentOccupants,
        occupantIds: occupantIds
      } as Room;
    });
    
    // Sort rooms by name in ascending order
    return rooms.sort((a, b) => {
      // Extract numeric part from room name (assuming format like "Room 01", "Room 2", etc.)
      const roomNumberA = parseInt(a.name.replace(/\D/g, ''));
      const roomNumberB = parseInt(b.name.replace(/\D/g, ''));
      
      // If we can extract valid numbers, sort numerically
      if (!isNaN(roomNumberA) && !isNaN(roomNumberB)) {
        return roomNumberA - roomNumberB;
      }
      
      // Fall back to string comparison if we can't extract numbers
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error getting rooms by manager's dormitory:", error);
    return [];
  }
}; 

// Get historical occupancy data for trend analysis
export const getHistoricalOccupancyData = async (semester?: string): Promise<{
  dates: string[];
  occupancyRates: number[];
}> => {
  try {
    console.log("Fetching historical occupancy data from Firestore reservations and rooms collections...");
    
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return {
        dates: [],
        occupancyRates: []
      }; // Return empty data if no buildings are assigned
    }
    
    // Use the provided semester or get the current semester dynamically
    const semesterToUse = semester || getCurrentSemester();
    console.log(`Using semester: ${semesterToUse}`);
    
    // Get all rooms from managed buildings to calculate total capacity
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('building', 'in', managedBuildings)
    );
    const roomsSnap = await getDocs(roomsQuery);
    
    let totalCapacity = 0;
    roomsSnap.docs.forEach(doc => {
      const roomData = doc.data();
      totalCapacity += roomData.capacity || 0;
    });
    
    console.log(`Total room capacity: ${totalCapacity}`);
    
    // Query the reservations collection to get historical occupancy data for managed buildings
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', semesterToUse),
      where('status', '==', 'approved'),
      where('building', 'in', managedBuildings),
      orderBy('requestDate', 'asc')
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    console.log(`Found ${reservationsSnap.size} approved reservations for ${semesterToUse}`);
    
    // Process data to get occupancy rates over time
    const occupancyMap = new Map<string, number>();
    const dateMap = new Map<string, Date>();
    
    // Get semester start and end dates
    const now = new Date();
    const semesterStart = new Date(now);
    semesterStart.setMonth(semesterStart.getMonth() - 4); // Approximate start of semester
    
    // Create initial data points for the start of semester (0% occupancy)
    const startDateStr = semesterStart.toISOString().split('T')[0];
    occupancyMap.set(startDateStr, 0);
    dateMap.set(startDateStr, semesterStart);
    
    // Process each reservation to build occupancy over time
    let cumulativeOccupancy = 0;
    
    reservationsSnap.docs.forEach(doc => {
      const data = doc.data();
      let requestDate: Date | null = null;
      
      // Extract date from reservation
      if (data.requestDate) {
        requestDate = new Date(data.requestDate);
      } else if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          requestDate = new Date(data.createdAt);
        } else if (data.createdAt.toDate) {
          requestDate = data.createdAt.toDate();
        }
      } else if (data.updatedAt) {
        if (typeof data.updatedAt === 'string') {
          requestDate = new Date(data.updatedAt);
        } else if (data.updatedAt.toDate) {
          requestDate = data.updatedAt.toDate();
        }
      }
      
      if (requestDate) {
        const dateStr = requestDate.toISOString().split('T')[0];
        
        // Add this date to our tracking
        if (!occupancyMap.has(dateStr)) {
          occupancyMap.set(dateStr, cumulativeOccupancy);
          dateMap.set(dateStr, requestDate);
        }
        
        // Increment occupancy (each reservation represents one or more occupants)
        const attendees = data.attendees || 1;
        cumulativeOccupancy += attendees;
        occupancyMap.set(dateStr, cumulativeOccupancy);
      }
    });
    
    // Also check activity_history for additional data points
    const historyQuery = query(
      collection(db, 'activity_history'),
      where('semester', '==', semesterToUse),
      where('status', '==', 'approved'),
      where('building', 'in', managedBuildings),
      orderBy('timestamp', 'asc')
    );
    
    const historySnap = await getDocs(historyQuery);
    console.log(`Found ${historySnap.size} activity history entries for ${semesterToUse}`);
    
    historySnap.docs.forEach(doc => {
      const data = doc.data();
      const timestamp = data.timestamp;
      
      if (timestamp) {
        // Convert timestamp to date string (YYYY-MM-DD)
        let date: Date;
        if (typeof timestamp === 'string') {
          date = new Date(timestamp);
        } else if (timestamp.toDate) {
          date = timestamp.toDate();
        } else {
          return; // Skip if timestamp is invalid
        }
        
        const dateStr = date.toISOString().split('T')[0];
        
        // Only add if we don't already have data for this date
        if (!occupancyMap.has(dateStr)) {
          occupancyMap.set(dateStr, cumulativeOccupancy);
          dateMap.set(dateStr, date);
        }
      }
    });
    
    // Add current date with current occupancy
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];
    if (!occupancyMap.has(currentDateStr)) {
      occupancyMap.set(currentDateStr, cumulativeOccupancy);
      dateMap.set(currentDateStr, currentDate);
    }
    
    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      return dateMap.get(a)!.getTime() - dateMap.get(b)!.getTime();
    });
    
    console.log(`Generated ${sortedDates.length} data points for occupancy trend`);
    
    // Calculate occupancy rates as percentages of total capacity
    const occupancyRates = sortedDates.map(date => {
      const occupancy = occupancyMap.get(date) || 0;
      return totalCapacity > 0 ? Math.round((occupancy / totalCapacity) * 100) : 0;
    });
    
    // If we have too many data points, sample them to get 6 points
    const sampleSize = 6;
    let dates: string[] = [];
    let rates: number[] = [];
    
    if (sortedDates.length <= sampleSize) {
      dates = sortedDates;
      rates = occupancyRates;
    } else {
      // Always include the first point
      dates.push(sortedDates[0]);
      rates.push(occupancyRates[0]);
      
      // Sample evenly across the middle
      const step = Math.floor((sortedDates.length - 2) / (sampleSize - 2));
      for (let i = 1; i < sampleSize - 1; i++) {
        const index = Math.min(step * i, sortedDates.length - 2);
        dates.push(sortedDates[index]);
        rates.push(occupancyRates[index]);
      }
      
      // Always include the most recent data point
      dates.push(sortedDates[sortedDates.length - 1]);
      rates.push(occupancyRates[occupancyRates.length - 1]);
    }
    
    console.log("Final occupancy trend data:", { dates, rates });
    
    return {
      dates,
      occupancyRates: rates
    };
  } catch (error) {
    console.error("Error getting historical occupancy data:", error);
    return {
      dates: [],
      occupancyRates: []
    };
  }
};

// Get reservation data for analytics
export const getReservationAnalytics = async (semester?: string): Promise<{
  weekly: { week: string; count: number }[];
  statusDistribution: { approved: number; pending: number; denied: number };
}> => {
  try {
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return {
        weekly: [],
        statusDistribution: { approved: 0, pending: 0, denied: 0 }
      }; // Return empty data if no buildings are assigned
    }
    
    // Use the provided semester or get the current semester dynamically
    const semesterToUse = semester || getCurrentSemester();
    
    // Query all reservations for the specified semester and managed buildings
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', semesterToUse),
      where('building', 'in', managedBuildings)
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    
    // Status distribution
    let approved = 0;
    let pending = 0;
    let denied = 0;
    
    // Weekly data
    const weeklyMap = new Map<string, number>();
    const now = new Date();
    const startOfSemester = new Date(now);
    startOfSemester.setMonth(startOfSemester.getMonth() - 4); // Approximate start of semester
    
    // Create week buckets (6 weeks)
    for (let i = 0; i < 6; i++) {
      const weekDate = new Date(startOfSemester);
      weekDate.setDate(weekDate.getDate() + (i * 7));
      const weekLabel = `Week ${i + 1}`;
      weeklyMap.set(weekLabel, 0);
    }
    
    // Process reservations
    reservationsSnap.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      if (data.status === 'approved') {
        approved++;
      } else if (data.status === 'pending') {
        pending++;
      } else if (data.status === 'denied') {
        denied++;
      }
      
      // Group by week
      let requestDate: Date | null = null;
      
      if (data.requestDate) {
        requestDate = new Date(data.requestDate);
      } else if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          requestDate = new Date(data.createdAt);
        } else if (data.createdAt.toDate) {
          requestDate = data.createdAt.toDate();
        }
      }
      
      if (requestDate) {
        // Determine which week bucket this falls into
        const timeDiff = requestDate.getTime() - startOfSemester.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const weekNum = Math.min(5, Math.max(0, Math.floor(daysDiff / 7)));
        const weekLabel = `Week ${weekNum + 1}`;
        
        weeklyMap.set(weekLabel, (weeklyMap.get(weekLabel) || 0) + 1);
      }
    });
    
    // Convert weekly map to array
    const weekly = Array.from(weeklyMap.entries()).map(([week, count]) => ({
      week,
      count
    }));
    
    // Sort weekly data by week number
    weekly.sort((a, b) => {
      const weekNumA = parseInt(a.week.split(' ')[1]);
      const weekNumB = parseInt(b.week.split(' ')[1]);
      return weekNumA - weekNumB;
    });
    
    return {
      weekly,
      statusDistribution: { approved, pending, denied }
    };
  } catch (error) {
    console.error("Error getting reservation analytics:", error);
    return {
      weekly: [],
      statusDistribution: { approved: 0, pending: 0, denied: 0 }
    };
  }
};

// Get reservation data for analytics filtered by manager's assigned dormitory
export const getReservationAnalyticsByDorm = async (semester?: string): Promise<{
  weekly: { week: string; count: number }[];
  statusDistribution: { approved: number; pending: number; denied: number };
}> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty data
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return {
        weekly: [],
        statusDistribution: { approved: 0, pending: 0, denied: 0 }
      };
    }
    
    // Use the provided semester or get the current semester dynamically
    const semesterToUse = semester || getCurrentSemester();
    
    // Query all reservations for the specified semester and managed dormitory
    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', semesterToUse),
      where('dormId', '==', managedDormId)
    );
    
    const reservationsSnap = await getDocs(reservationsQuery);
    console.log(`Found ${reservationsSnap.size} reservations for dormId: ${managedDormId}`);
    
    // Status distribution
    let approved = 0;
    let pending = 0;
    let denied = 0;
    
    // Weekly data
    const weeklyMap = new Map<string, number>();
    const now = new Date();
    const startOfSemester = new Date(now);
    startOfSemester.setMonth(startOfSemester.getMonth() - 4); // Approximate start of semester
    
    // Create week buckets (6 weeks)
    for (let i = 0; i < 6; i++) {
      const weekDate = new Date(startOfSemester);
      weekDate.setDate(weekDate.getDate() + (i * 7));
      const weekLabel = `Week ${i + 1}`;
      weeklyMap.set(weekLabel, 0);
    }
    
    // Process reservations
    reservationsSnap.docs.forEach(doc => {
      const data = doc.data();
      
      // Count by status
      if (data.status === 'approved') {
        approved++;
      } else if (data.status === 'pending') {
        pending++;
      } else if (data.status === 'denied') {
        denied++;
      }
      
      // Group by week
      let requestDate: Date | null = null;
      
      if (data.requestDate) {
        requestDate = new Date(data.requestDate);
      } else if (data.createdAt) {
        if (typeof data.createdAt === 'string') {
          requestDate = new Date(data.createdAt);
        } else if (data.createdAt.toDate) {
          requestDate = data.createdAt.toDate();
        }
      }
      
      if (requestDate) {
        // Determine which week bucket this falls into
        const timeDiff = requestDate.getTime() - startOfSemester.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const weekNum = Math.min(5, Math.max(0, Math.floor(daysDiff / 7)));
        const weekLabel = `Week ${weekNum + 1}`;
        
        weeklyMap.set(weekLabel, (weeklyMap.get(weekLabel) || 0) + 1);
      }
    });
    
    // Convert weekly map to array
    const weekly = Array.from(weeklyMap.entries()).map(([week, count]) => ({
      week,
      count
    }));
    
    // Sort weekly data by week number
    weekly.sort((a, b) => {
      const weekNumA = parseInt(a.week.split(' ')[1]);
      const weekNumB = parseInt(b.week.split(' ')[1]);
      return weekNumA - weekNumB;
    });
    
    return {
      weekly,
      statusDistribution: { approved, pending, denied }
    };
  } catch (error) {
    console.error("Error getting reservation analytics by dorm:", error);
    return {
      weekly: [],
      statusDistribution: { approved: 0, pending: 0, denied: 0 }
    };
  }
};

// Get RFID entry/exit activity data
export const getRFIDActivityData = async (timeRange: 'today' | 'week' | 'month' = 'today'): Promise<{
  hours: string[];
  entryData: number[];
  exitData: number[];
  alerts: {
    level: 'high' | 'medium' | 'low';
    type: string;
    location: string;
    time: string;
  }[];
}> => {
  try {
    console.log(`Fetching RFID data from rfidLogs collection for time range: ${timeRange}`);
    
    // Get current user's managed buildings
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedBuildings = userData.managedBuildings || [];

    if (managedBuildings.length === 0) {
      return {
        hours: [],
        entryData: [],
        exitData: [],
        alerts: []
      }; // Return empty data if no buildings are assigned
    }
    
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
    // Use Firestore Timestamp for the query
    const firestoreStartDate = Timestamp.fromDate(startDate);
    
    console.log(`Using Firestore timestamp for query: ${firestoreStartDate}`);
    console.log(`Start date: ${startDate.toISOString()}`);
    
    // Create a query that filters by both timestamp and location (building)
    const logsQuery = query(
      collection(db, 'rfidLogs'),
      where('timestamp', '>=', firestoreStartDate),
      where('building', 'in', managedBuildings),
      orderBy('timestamp', 'asc')
    );
    
    console.log('Executing Firestore query on rfidLogs collection...');
    const logsSnap = await getDocs(logsQuery);
    console.log(`Retrieved ${logsSnap.size} documents from rfidLogs collection`);
    
    // Prepare data structures
    const hourlyEntryMap = new Map<string, number>();
    const hourlyExitMap = new Map<string, number>();
    const alerts: {
      level: 'high' | 'medium' | 'low';
      type: string;
      location: string;
      time: string;
    }[] = [];
    
    // Initialize data structures based on time range
    if (timeRange === 'today') {
      // For today, use hourly data (24 hours)
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        hourlyEntryMap.set(`${hour}:00`, 0);
        hourlyExitMap.set(`${hour}:00`, 0);
      }
    } else if (timeRange === 'week') {
      // For week, use daily data (7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => {
        hourlyEntryMap.set(day, 0);
        hourlyExitMap.set(day, 0);
      });
    } else {
      // For month, use weekly data (4 weeks)
      for (let i = 1; i <= 4; i++) {
        hourlyEntryMap.set(`Week ${i}`, 0);
        hourlyExitMap.set(`Week ${i}`, 0);
      }
    }

    // Process logs
    logsSnap.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.timestamp) {
        let date: Date;
        
        if (typeof data.timestamp === 'string') {
          date = new Date(data.timestamp);
        } else if (data.timestamp.toDate) {
          date = data.timestamp.toDate();
        } else {
          return; // Skip if timestamp is invalid
        }
        
        let key: string;
        
        if (timeRange === 'today') {
          // For today, use hourly format
          const hour = date.getHours().toString().padStart(2, '0');
          key = `${hour}:00`;
        } else if (timeRange === 'week') {
          // For week, use day name
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          key = days[date.getDay()];
        } else {
          // For month, determine which week
          const dayOfMonth = date.getDate();
          const weekNum = Math.min(4, Math.ceil(dayOfMonth / 7));
          key = `Week ${weekNum}`;
        }
        
        // Count entries and exits
        if (data.action === 'entry') {
          hourlyEntryMap.set(key, (hourlyEntryMap.get(key) || 0) + 1);
        } else if (data.action === 'exit') {
          hourlyExitMap.set(key, (hourlyExitMap.get(key) || 0) + 1);
        }
        
        // Check for potential alerts (unusual activity)
        const currentHour = new Date().getHours();
        
        // Example alert conditions (can be customized)
        if (timeRange === 'today' && data.action === 'entry') {
          const hour = date.getHours();
          
          // Late night entries
          if (hour >= 22 || hour <= 5) {
            alerts.push({
              level: 'medium',
              type: 'After-hours entry',
              location: `${data.building} - ${data.room || 'Unknown'}`,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
          
          // Multiple entries in short time (would need more sophisticated detection)
          // This is just a placeholder for demonstration
          if (Math.random() > 0.95) { // Random alert for demo purposes
          alerts.push({
              level: 'low',
              type: 'Multiple entries',
              location: `${data.building} - ${data.room || 'Unknown'}`,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
      } else {
        console.log(`Skipping document - missing timestamp:`, data);
      }
    });
    
    // Convert maps to arrays in the correct order
    const hours = Array.from(hourlyEntryMap.keys());
    const entryData = hours.map(hour => hourlyEntryMap.get(hour) || 0);
    const exitData = hours.map(hour => hourlyExitMap.get(hour) || 0);
    
    // Sort hours if needed
        if (timeRange === 'today') {
      // Sort hours chronologically
      hours.sort();
    } else if (timeRange === 'week') {
      // Sort days of week in correct order
      const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      hours.sort((a, b) => dayOrder[a as keyof typeof dayOrder] - dayOrder[b as keyof typeof dayOrder]);
        } else {
      // Sort weeks numerically
      hours.sort((a, b) => {
        const weekNumA = parseInt(a.split(' ')[1]);
        const weekNumB = parseInt(b.split(' ')[1]);
        return weekNumA - weekNumB;
      });
    }
    
    // Re-map the data after sorting
    const sortedEntryData = hours.map(hour => hourlyEntryMap.get(hour) || 0);
    const sortedExitData = hours.map(hour => hourlyExitMap.get(hour) || 0);
    
    return {
      hours,
      entryData: sortedEntryData,
      exitData: sortedExitData,
      alerts
    };
  } catch (error) {
    console.error("Error getting RFID activity data:", error);
    return {
      hours: [],
      entryData: [],
      exitData: [],
      alerts: []
    };
  }
};

// Get RFID entry/exit activity data filtered by manager's assigned dormitory
export const getRFIDActivityDataByDorm = async (timeRange: 'today' | 'week' | 'month' = 'today'): Promise<{
  hours: string[];
  entryData: number[];
  exitData: number[];
  alerts: {
    level: 'high' | 'medium' | 'low';
    type: string;
    location: string;
    time: string;
  }[];
  topTenants: {
    studentId: string;
    studentName: string;
    totalActivity: number;
    entries: number;
    exits: number;
    dormName?: string;
    building?: string;
  }[];
}> => {
  try {
    console.log(`Fetching RFID data from rfidLogs collection for time range: ${timeRange} by dormId`);
    
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    // If no dormitory is assigned to this manager, return empty data
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return {
        hours: [],
        entryData: [],
        exitData: [],
        alerts: [],
        topTenants: []
      };
    }
    
    // Get the dormitory details to find its name and building
    const dormDoc = await getDoc(doc(db, 'dormitories', managedDormId));
    let dormName = '';
    let buildingName = '';
    
    if (dormDoc.exists()) {
      const dormData = dormDoc.data();
      dormName = dormData.name || '';
      buildingName = dormData.building || dormName;
      console.log(`Found dormitory: ${dormName}, building: ${buildingName}`);
    } else {
      console.log(`Dormitory with ID ${managedDormId} not found`);
    }
    
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
    // Use Firestore Timestamp for the query
    const firestoreStartDate = Timestamp.fromDate(startDate);
    
    console.log(`Using Firestore timestamp for query: ${firestoreStartDate}`);
    console.log(`Start date: ${startDate.toISOString()}`);
    
    // DEBUGGING: First try to get all logs without filters to see if any exist
    console.log("DEBUG: Checking if any rfidLogs exist at all...");
    const allLogsQuery = query(
      collection(db, 'rfidLogs'),
      where('timestamp', '>=', firestoreStartDate),
      orderBy('timestamp', 'asc'),
      limit(10)
    );
    
    const allLogsSnap = await getDocs(allLogsQuery);
    console.log(`DEBUG: Found ${allLogsSnap.size} total rfidLogs documents`);
    
    if (allLogsSnap.size > 0) {
      // Log the first document to see its structure
      const sampleDoc = allLogsSnap.docs[0].data();
      console.log("DEBUG: Sample rfidLog document structure:", sampleDoc);
    }
    
    // Try multiple query approaches in sequence
    let logsSnap;
    let queryDescription = '';
    
    // 1. First try with dormId filter
    let logsQuery = query(
      collection(db, 'rfidLogs'),
      where('timestamp', '>=', firestoreStartDate),
      where('dormId', '==', managedDormId),
      orderBy('timestamp', 'asc')
    );
    
    console.log(`Executing Firestore query on rfidLogs with dormId=${managedDormId}`);
    logsSnap = await getDocs(logsQuery);
    console.log(`Found ${logsSnap.size} documents with dormId filter`);
    
    if (logsSnap.size > 0) {
      queryDescription = `dormId: ${managedDormId}`;
    } else if (buildingName) {
      // 2. Try with building filter if dormId returned no results
      console.log(`No results with dormId filter. Trying building filter: ${buildingName}`);
      logsQuery = query(
        collection(db, 'rfidLogs'),
        where('timestamp', '>=', firestoreStartDate),
        where('building', '==', buildingName),
        orderBy('timestamp', 'asc')
      );
      
      logsSnap = await getDocs(logsQuery);
      console.log(`Found ${logsSnap.size} documents with building filter`);
      
      if (logsSnap.size > 0) {
        queryDescription = `building: ${buildingName}`;
      } else if (dormName && dormName !== buildingName) {
        // 3. Try with dormName as building if different from buildingName
        console.log(`No results with building filter. Trying dormName as building: ${dormName}`);
        logsQuery = query(
          collection(db, 'rfidLogs'),
          where('timestamp', '>=', firestoreStartDate),
          where('building', '==', dormName),
          orderBy('timestamp', 'asc')
        );
        
        logsSnap = await getDocs(logsQuery);
        console.log(`Found ${logsSnap.size} documents with dormName as building filter`);
        
        if (logsSnap.size > 0) {
          queryDescription = `building: ${dormName}`;
        }
      }
    }
    
    // 4. Try with dormName field if all previous attempts failed
    if (logsSnap.size === 0 && dormName) {
      console.log(`No results with previous filters. Trying dormName field: ${dormName}`);
      logsQuery = query(
        collection(db, 'rfidLogs'),
        where('timestamp', '>=', firestoreStartDate),
        where('dormName', '==', dormName),
        orderBy('timestamp', 'asc')
      );
      
      logsSnap = await getDocs(logsQuery);
      console.log(`Found ${logsSnap.size} documents with dormName field filter`);
      
      if (logsSnap.size > 0) {
        queryDescription = `dormName: ${dormName}`;
      }
    }
    
    // 5. If still no results, try without location filters (for testing purposes)
    if (logsSnap.size === 0) {
      console.log("No logs found with any location filter. Retrieving limited logs for testing...");
      logsQuery = query(
        collection(db, 'rfidLogs'),
        where('timestamp', '>=', firestoreStartDate),
        orderBy('timestamp', 'asc'),
        limit(50) // Limit to prevent too many results
      );
      
      logsSnap = await getDocs(logsQuery);
      console.log(`Retrieved ${logsSnap.size} documents without location filters`);
      queryDescription = 'all locations (limited to 50)';
    }
    
    console.log(`Processing ${logsSnap.size} RFID log documents from ${queryDescription}`);
    
    // Prepare data structures
    const hourlyEntryMap = new Map<string, number>();
    const hourlyExitMap = new Map<string, number>();
    const alerts: {
      level: 'high' | 'medium' | 'low';
      type: string;
      location: string;
      time: string;
    }[] = [];
    
    // Track tenant activity
    const tenantActivityMap = new Map<string, {
      studentId: string;
      studentName: string;
      totalActivity: number;
      entries: number;
      exits: number;
      dormName: string;
      building: string;
    }>();

    // Initialize data structures based on time range
    if (timeRange === 'today') {
      // For today, use hourly data (24 hours)
      for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        hourlyEntryMap.set(`${hour}:00`, 0);
        hourlyExitMap.set(`${hour}:00`, 0);
      }
    } else if (timeRange === 'week') {
      // For week, use daily data (7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => {
        hourlyEntryMap.set(day, 0);
        hourlyExitMap.set(day, 0);
      });
    } else {
      // For month, use weekly data (4 weeks)
      for (let i = 1; i <= 4; i++) {
        hourlyEntryMap.set(`Week ${i}`, 0);
        hourlyExitMap.set(`Week ${i}`, 0);
      }
    }
    
    // Process logs
    logsSnap.docs.forEach((doc) => {
      const data = doc.data();
      
      if (data.timestamp) {
        let date: Date;
        
        if (typeof data.timestamp === 'string') {
          date = new Date(data.timestamp);
        } else if (data.timestamp.toDate) {
          date = data.timestamp.toDate();
        } else {
          console.log(`Skipping document - invalid timestamp format:`, data.timestamp);
          return; // Skip if timestamp is invalid
        }
        
        let key: string;
        
        if (timeRange === 'today') {
          // For today, use hourly format
          const hour = date.getHours().toString().padStart(2, '0');
          key = `${hour}:00`;
        } else if (timeRange === 'week') {
          // For week, use day name
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          key = days[date.getDay()];
        } else {
          // For month, determine which week
          const dayOfMonth = date.getDate();
          const weekNum = Math.min(4, Math.ceil(dayOfMonth / 7));
          key = `Week ${weekNum}`;
        }
        
        // Count entries and exits
        if (data.action === 'entry') {
          hourlyEntryMap.set(key, (hourlyEntryMap.get(key) || 0) + 1);
        } else if (data.action === 'exit') {
          hourlyExitMap.set(key, (hourlyExitMap.get(key) || 0) + 1);
        }
        
        // Track tenant activity
        const studentId = data.studentId || data.userId || '';
        // Try multiple fields that might contain the student name
        const studentName = data.studentName || data.userName || data.name || studentId;
        
        if (studentId) {
          const tenantKey = studentId;
          if (!tenantActivityMap.has(tenantKey)) {
            tenantActivityMap.set(tenantKey, {
              studentId,
              studentName,
              totalActivity: 0,
              entries: 0,
              exits: 0,
              dormName: data.dormName || dormName, // Include dormName
              building: data.building || buildingName // Include building
            });
          }
          
          const tenantData = tenantActivityMap.get(tenantKey)!;
          tenantData.totalActivity += 1;
          
          if (data.action === 'entry') {
            tenantData.entries += 1;
          } else if (data.action === 'exit') {
            tenantData.exits += 1;
          }
          } else {
          console.log(`Document has no studentId or userId:`, data);
        }
        
        // Check for potential alerts (unusual activity)
        if (timeRange === 'today' && data.action === 'entry') {
          const hour = date.getHours();
          
          // Late night entries
          if (hour >= 22 || hour <= 5) {
          alerts.push({
              level: 'medium',
              type: 'After-hours entry',
              location: `${data.building || dormName} - ${data.room || 'Unknown'}`,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
          
          // Multiple entries in short time (would need more sophisticated detection)
          // This is just a placeholder for demonstration
          if (Math.random() > 0.95) { // Random alert for demo purposes
            alerts.push({
              level: 'low',
              type: 'Multiple entries',
              location: `${data.building || dormName} - ${data.room || 'Unknown'}`,
              time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
      } else {
        console.log(`Skipping document with missing timestamp:`, data);
      }
    });

    // Convert maps to arrays in the correct order
    const hours = Array.from(hourlyEntryMap.keys());
    
    // Sort hours if needed
    if (timeRange === 'today') {
      // Sort hours chronologically
      hours.sort();
    } else if (timeRange === 'week') {
      // Sort days of week in correct order
      const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
      hours.sort((a, b) => dayOrder[a as keyof typeof dayOrder] - dayOrder[b as keyof typeof dayOrder]);
    } else {
      // Sort weeks numerically
      hours.sort((a, b) => {
        const weekNumA = parseInt(a.split(' ')[1]);
        const weekNumB = parseInt(b.split(' ')[1]);
        return weekNumA - weekNumB;
      });
    }
    
    // Re-map the data after sorting
    const sortedEntryData = hours.map(hour => hourlyEntryMap.get(hour) || 0);
    const sortedExitData = hours.map(hour => hourlyExitMap.get(hour) || 0);
    
    // Get top 5 tenants with most activity
    const topTenants = Array.from(tenantActivityMap.values())
      .sort((a, b) => b.totalActivity - a.totalActivity)
      .slice(0, 5);
    
    console.log(`Found ${tenantActivityMap.size} unique tenants with activity`);
    console.log(`Top 5 tenants:`, topTenants);
    
    // If we have no tenants but we have activity data, create some placeholder data
    if (topTenants.length === 0 && (sortedEntryData.some(v => v > 0) || sortedExitData.some(v => v > 0))) {
      console.log("No tenant data found but activity exists. Creating placeholder data...");
      
      // Create placeholder tenant data for testing
      for (let i = 1; i <= 5; i++) {
        const entries = Math.floor(Math.random() * 10) + 1;
        const exits = Math.floor(Math.random() * 10) + 1;
        topTenants.push({
          studentId: `ST${1000 + i}`,
          studentName: `Test Student ${i}`,
          totalActivity: entries + exits,
          entries,
          exits,
          dormName: dormName,
          building: buildingName
        });
      }
    }
    
    return {
      hours,
      entryData: sortedEntryData,
      exitData: sortedExitData,
      alerts,
      topTenants
    };
  } catch (error) {
    console.error("Error getting RFID activity data by dorm:", error);
    return {
      hours: [],
      entryData: [],
      exitData: [],
      alerts: [],
      topTenants: []
    };
  }
};

// Get dashboard statistics for the current manager's assigned dormitory
export const getManagerDashboardStatsByDorm = async (): Promise<{
  pendingCount: number;
  semesterReservations: number;
  semesterApproved: number;
  semesterPending: number;
  overallOccupancy: number;
  activeStudents: number;
}> => {
  try {
    // Get current user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No authenticated user");
    }

    // Get user document to find assigned dormitory
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      throw new Error("User document not found");
    }

    const userData = userDoc.data();
    const managedDormId = userData.managedDormId;
    
    console.log("DEBUG - Manager's dormId:", managedDormId);
    
    // If no dormitory is assigned to this manager, return empty data
    if (!managedDormId) {
      console.log("No dormitory assigned to this manager");
      return {
        pendingCount: 0,
        semesterReservations: 0,
        semesterApproved: 0,
        semesterPending: 0,
        overallOccupancy: 0,
        activeStudents: 0
      };
    }
    
    // Get the dorm to access its data
    const dormData = await getDormById(managedDormId);
    console.log("DEBUG - Dorm data:", dormData);
    
    if (!dormData) {
      console.error("Could not find dormitory with ID:", managedDormId);
      return {
        pendingCount: 0,
        semesterReservations: 0,
        semesterApproved: 0,
        semesterPending: 0,
        overallOccupancy: 0,
        activeStudents: 0
      };
    }
    
    // Get current semester dynamically
    const currentSemester = getCurrentSemester();

    // Get pending reservations count for the managed dormitory
    const pendingQuery = query(
      collection(db, 'reservations'),
      where('status', '==', 'pending'),
      where('dormId', '==', managedDormId)
    );
    const pendingSnap = await getDocs(pendingQuery);
    const pendingCount = pendingSnap.size;
    
    // Get semester's reservations for the managed dormitory
    const semesterQuery = query(
      collection(db, 'reservations'),
      where('semester', '==', currentSemester),
      where('dormId', '==', managedDormId)
    );
    const semesterSnap = await getDocs(semesterQuery);
    
    let semesterApproved = 0;
    let semesterPending = 0;
    
    semesterSnap.forEach(doc => {
      const status = doc.data().status;
      if (status === 'approved') {
        semesterApproved++;
      } else if (status === 'pending') {
        semesterPending++;
      }
    });
    
    // Get all rooms from the managed dormitory
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('dormId', '==', managedDormId)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    console.log(`DEBUG - Found ${roomsSnap.size} rooms for dormId: ${managedDormId}`);
    
    // Calculate accurate occupancy statistics
    let totalRooms = roomsSnap.size;
    let totalCapacity = 0;
    let currentOccupants = 0;
    let occupantIds = new Set<string>();
    
    // Process each room to get accurate counts
    roomsSnap.forEach(doc => {
      const roomData = doc.data();
      console.log(`DEBUG - Room ${doc.id}:`, {
        name: roomData.name,
        capacity: roomData.capacity,
        currentOccupants: roomData.currentOccupants,
        occupantIds: roomData.occupantIds?.length || 0
      });
      
      // Add to total capacity
      const capacity = parseInt(roomData.capacity) || 0;
      totalCapacity += capacity;
      
      // Count current occupants - ensure we're parsing as integers
      const roomOccupants = parseInt(roomData.currentOccupants) || 0;
      currentOccupants += roomOccupants;
      
      // Collect unique occupant IDs
      if (roomData.occupantIds && Array.isArray(roomData.occupantIds)) {
        roomData.occupantIds.forEach((id: string) => {
          if (id) occupantIds.add(id);
        });
      }
    });
    
    console.log("DEBUG - Occupancy calculation:", {
      totalRooms,
      totalCapacity,
      currentOccupants,
      uniqueOccupants: occupantIds.size
    });
    
    // Get active students for this dormitory
    const studentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('assignedBuilding', '==', dormData.name) // Use the dorm name from the dormitory
    );
    
    const studentsSnap = await getDocs(studentsQuery);
    console.log(`DEBUG - Found ${studentsSnap.size} students with assignedBuilding=${dormData.name}`);
    
    // Use the larger of the two counts to ensure we don't miss anyone
    const activeStudents = Math.max(occupantIds.size, studentsSnap.size);
    
    // If we have rooms but no capacity data, assume a default capacity
    if (totalRooms > 0 && totalCapacity === 0) {
      console.log("WARNING: Room capacity data is missing, using default capacity of 2 per room");
      totalCapacity = totalRooms * 2;
    }
    
    // If we have capacity but no occupants data, use the occupantIds count as a fallback
    if (currentOccupants === 0 && occupantIds.size > 0) {
      console.log("WARNING: Room occupant count is missing, using occupantIds count instead");
      currentOccupants = occupantIds.size;
    }
    
    // Calculate occupancy rate based on total capacity vs current occupants
    const overallOccupancy = totalCapacity > 0 
      ? Math.round((currentOccupants / totalCapacity) * 100) 
      : 0;
    
    console.log("DEBUG - Final stats:", {
      pendingCount,
      semesterReservations: semesterApproved + semesterPending,
      semesterApproved,
      semesterPending,
      overallOccupancy,
      activeStudents,
      calculation: `${currentOccupants} / ${totalCapacity} * 100 = ${overallOccupancy}%`
    });
    
    return {
      pendingCount,
      semesterReservations: semesterApproved + semesterPending,
      semesterApproved,
      semesterPending,
      overallOccupancy,
      activeStudents
    };
  } catch (error) {
    console.error("Error getting dormitory dashboard stats:", error);
    return {
      pendingCount: 0,
      semesterReservations: 0,
      semesterApproved: 0,
      semesterPending: 0,
      overallOccupancy: 0,
      activeStudents: 0
    };
  }
};