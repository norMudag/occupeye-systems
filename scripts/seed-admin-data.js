// Script to seed Firestore with initial admin dashboard data
const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  Timestamp 
} = require("firebase/firestore");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBW0TZSAvKSsqeGOSU4GXfLX1TsooskLs",
  authDomain: "occupeye-system.firebaseapp.com",
  projectId: "occupeye-system",
  storageBucket: "occupeye-system.firebasestorage.app",
  messagingSenderId: "841301770831",
  appId: "1:841301770831:web:5e388f5462fd35f399e03a",
  measurementId: "G-NBQP5BQ0GB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample room data
const rooms = [
  { 
    name: "Study Room A", 
    building: "North Hall", 
    capacity: 4, 
    status: "available", 
    rfidEnabled: true,
    amenities: ["Whiteboard", "Power Outlets", "Wi-Fi"]
  },
  { 
    name: "Study Room B", 
    building: "North Hall", 
    capacity: 6, 
    status: "maintenance", 
    rfidEnabled: true,
    amenities: ["Whiteboard", "Power Outlets", "Wi-Fi", "Projector"]
  },
  { 
    name: "Meeting Room", 
    building: "South Hall", 
    capacity: 8, 
    status: "occupied", 
    rfidEnabled: true,
    amenities: ["Whiteboard", "Power Outlets", "Wi-Fi", "Projector", "Conference Phone"]
  },
  { 
    name: "Group Study", 
    building: "East Wing", 
    capacity: 12, 
    status: "available", 
    rfidEnabled: false,
    amenities: ["Whiteboard", "Power Outlets", "Wi-Fi", "Computers"]
  }
];

// Sample RFID logs
const generateRfidLogs = () => {
  const logs = [];
  const actions = ["entry", "exit"];
  const today = new Date();
  
  // Generate a random entry/exit log for the past 24 hours
  for (let i = 0; i < 10; i++) {
    const randomTime = new Date(today.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    logs.push({
      studentId: `STU${100000 + Math.floor(Math.random() * 900000)}`,
      studentName: `Sample Student ${i + 1}`,
      room: `Room ${101 + i}`,
      action: actions[Math.floor(Math.random() * actions.length)],
      timestamp: Timestamp.fromDate(randomTime)
    });
  }
  
  return logs;
};

// Seed Firestore with sample data
async function seedFirestore() {
  try {
    console.log("Starting to seed Firestore database...");
    
    // Add rooms
    console.log("Adding rooms...");
    for (const room of rooms) {
      const roomRef = collection(db, "rooms");
      await addDoc(roomRef, room);
    }
    
    // Add RFID logs
    console.log("Adding RFID logs...");
    const rfidLogs = generateRfidLogs();
    for (const log of rfidLogs) {
      const logRef = collection(db, "rfidLogs");
      await addDoc(logRef, log);
    }
    
    console.log("Firestore database seeded successfully!");
  } catch (error) {
    console.error("Error seeding Firestore:", error);
  }
}

// Run the seed function
seedFirestore(); 