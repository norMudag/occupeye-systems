// Script to seed Firestore database with dormitories and rooms data
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// List of dormitories with their details
const dormitories = [
  {
    building: "Princess Lawanen Hall - North Wings",
    totalRooms: 40,
    availableRooms: 15,
    occupancyRate: 62.5
  },
  {
    building: "Princess Lawanen Hall - South Wings",
    totalRooms: 40,
    availableRooms: 22,
    occupancyRate: 45
  },
  {
    building: "Rajah Indarapatra Hall - North Wings",
    totalRooms: 35,
    availableRooms: 8,
    occupancyRate: 77.1
  },
  {
    building: "Rajah Indarapatra Hall - South Wings",
    totalRooms: 35,
    availableRooms: 12,
    occupancyRate: 65.7
  },
  {
    building: "Raja Dumdoma Hall",
    totalRooms: 30,
    availableRooms: 5,
    occupancyRate: 83.3
  },
  {
    building: "Raja Sulaiman Hall",
    totalRooms: 30,
    availableRooms: 7,
    occupancyRate: 76.7
  },
  {
    building: "Super New Boys",
    totalRooms: 50,
    availableRooms: 20,
    occupancyRate: 60
  },
  {
    building: "Super New Girls",
    totalRooms: 50,
    availableRooms: 18,
    occupancyRate: 64
  },
  {
    building: "Bolawan Hall",
    totalRooms: 25,
    availableRooms: 3,
    occupancyRate: 88
  },
  {
    building: "Turogan Hall",
    totalRooms: 25,
    availableRooms: 6,
    occupancyRate: 76
  }
];

interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  status: string;
}

// Generate sample rooms for each dormitory
const generateRooms = (): Room[] => {
  const rooms: Room[] = [];
  
  dormitories.forEach(dorm => {
    const building = dorm.building;
    const totalRooms = dorm.totalRooms;
    const availableRooms = dorm.availableRooms;
    
    // Create occupied rooms
    for (let i = 1; i <= totalRooms - availableRooms; i++) {
      const roomNumber = i.toString().padStart(3, '0');
      const roomId = `${building.substring(0, 3)}${roomNumber}`;
      
      rooms.push({
        id: roomId,
        name: `Room ${roomNumber}`,
        building: building,
        capacity: Math.floor(Math.random() * 2) + 2, // 2-3 people capacity
        status: "occupied"
      });
    }
    
    // Create available rooms
    for (let i = totalRooms - availableRooms + 1; i <= totalRooms; i++) {
      const roomNumber = i.toString().padStart(3, '0');
      const roomId = `${building.substring(0, 3)}${roomNumber}`;
      
      rooms.push({
        id: roomId,
        name: `Room ${roomNumber}`,
        building: building,
        capacity: Math.floor(Math.random() * 2) + 2, // 2-3 people capacity
        status: "available"
      });
    }
  });
  
  return rooms;
};

// Clear existing data
const clearCollection = async (collectionName: string): Promise<void> => {
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const deletePromises = snapshot.docs.map(docSnapshot => 
    deleteDoc(doc(db, collectionName, docSnapshot.id))
  );
  
  await Promise.all(deletePromises);
};

// Seed dormitories to Firestore
const seedDormitories = async (): Promise<void> => {
  try {
    await clearCollection('dormitories');
    console.log('Cleared dormitories collection');
    
    for (const dormitory of dormitories) {
      const docRef = doc(collection(db, 'dormitories'));
      await setDoc(docRef, dormitory);
      console.log(`Added dormitory: ${dormitory.building}`);
    }
    
    console.log('Dormitories seeding completed');
  } catch (error) {
    console.error('Error seeding dormitories:', error);
    throw error;
  }
};

// Seed rooms to Firestore
const seedRooms = async (): Promise<void> => {
  try {
    const rooms = generateRooms();
    
    await clearCollection('rooms');
    console.log('Cleared rooms collection');
    
    for (const room of rooms) {
      const docRef = doc(collection(db, 'rooms'));
      await setDoc(docRef, room);
      console.log(`Added room: ${room.name} in ${room.building}`);
    }
    
    console.log('Rooms seeding completed');
  } catch (error) {
    console.error('Error seeding rooms:', error);
    throw error;
  }
};

// Run the seed functions
export const seedData = async (): Promise<boolean> => {
  try {
    await seedDormitories();
    await seedRooms();
    console.log('Database seeding completed successfully');
    return true;
  } catch (error) {
    console.error('Database seeding failed:', error);
    return false;
  }
}; 