// Script to seed Firestore with initial notification data
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

// Sample users for testing (replace these with real user IDs from your system)
const testStudentId = "student123";
const testManagerId = "manager456";

// Sample student notifications
const studentNotifications = [
  {
    title: "Reservation Approved",
    message: "Your reservation for Study Room A (PLH-N-201) on Jan 15, 2024 has been approved by Mike Johnson.",
    type: "success",
    read: false,
    timestamp: "2024-01-12 15:45:00",
    action: "View Reservation",
    userId: testStudentId,
  },
  {
    title: "Reservation Reminder",
    message: "Your reservation for Study Room A starts in 1 hour. Room: PLH-N-201, Time: 14:00-16:00.",
    type: "info",
    read: false,
    timestamp: "2024-01-15 13:00:00",
    action: "View Details",
    userId: testStudentId,
  },
  {
    title: "Reservation Cancelled",
    message: "Your reservation for Meeting Room (PLH-S-105) on Jan 20, 2024 has been cancelled due to maintenance.",
    type: "warning",
    read: true,
    timestamp: "2024-01-10 09:30:00",
    action: "Book Another Room",
    userId: testStudentId,
  },
  {
    title: "New Room Available",
    message: "A new study room (RDD-401) is now available for booking in Raja Dumdoma Hall.",
    type: "info",
    read: true,
    timestamp: "2024-01-08 14:20:00",
    action: "View Room",
    userId: testStudentId,
  },
  {
    title: "RFID Card Update",
    message: "Your RFID card has been successfully activated. You can now access reserved rooms.",
    type: "success",
    read: true,
    timestamp: "2024-01-05 10:15:00",
    action: null,
    userId: testStudentId,
  },
];

// Sample manager notifications
const managerNotifications = [
  {
    type: "approval",
    title: "New Reservation Request",
    message: "John Doe has requested PLH-N-201 for January 18, 2024. Requires your approval.",
    timestamp: "2024-01-15 14:30:00",
    read: false,
    priority: "high",
    userId: testManagerId,
  },
  {
    type: "approval",
    title: "Urgent Reservation Request",
    message: "Jane Smith has requested RIH-S-105 for tomorrow's project meeting. High priority request.",
    timestamp: "2024-01-15 13:45:00",
    read: false,
    priority: "high",
    userId: testManagerId,
  },
  {
    type: "system",
    title: "Room Maintenance Scheduled",
    message: "PLH-N-202 is scheduled for maintenance on January 20, 2024. Please update room status.",
    timestamp: "2024-01-14 16:20:00",
    read: true,
    priority: "normal",
    userId: testManagerId,
  },
  {
    type: "occupancy",
    title: "High Occupancy Alert",
    message: "Raja Dumdoma Hall has reached 85% occupancy. Consider monitoring closely.",
    timestamp: "2024-01-14 11:15:00",
    read: false,
    priority: "normal",
    userId: testManagerId,
  },
  {
    type: "approval",
    title: "Reservation Approved",
    message: "You approved Mike Wilson's reservation for RDD-301 on January 20, 2024.",
    timestamp: "2024-01-13 09:30:00",
    read: true,
    priority: "normal",
    userId: testManagerId,
  },
];

// Seed Firestore with sample notifications
async function seedNotificationsData() {
  try {
    console.log("Starting to seed notifications data...");
    
    // Add student notifications
    console.log("Adding student notifications...");
    const studentNotificationsRef = collection(db, "studentNotifications");
    for (const notification of studentNotifications) {
      await addDoc(studentNotificationsRef, notification);
    }
    
    // Add manager notifications
    console.log("Adding manager notifications...");
    const managerNotificationsRef = collection(db, "managerNotifications");
    for (const notification of managerNotifications) {
      await addDoc(managerNotificationsRef, notification);
    }
    
    console.log("Notifications seeded successfully!");
  } catch (error) {
    console.error("Error seeding notifications:", error);
  }
}

// Execute the seed function
seedNotificationsData(); 