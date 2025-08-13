// Script to seed RFID logs into Firestore for testing
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  limit
} = require('firebase/firestore');

// Firebase configuration (replace with your own)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample student IDs and names
const students = [
  { id: "ST1001", name: "John Smith" },
  { id: "ST1002", name: "Maria Garcia" },
  { id: "ST1003", name: "David Lee" },
  { id: "ST1004", name: "Sarah Johnson" },
  { id: "ST1005", name: "Ahmed Hassan" },
  { id: "ST1006", name: "Emma Wilson" },
  { id: "ST1007", name: "Carlos Rodriguez" },
  { id: "ST1008", name: "Priya Patel" }
];

// Sample buildings/dormitories
const buildings = [
  { name: "Building A", dormId: "rSX3ZyMhUm0wYtgmSLQv" },
  { name: "Building B", dormId: "another-dorm-id-here" }
];

// Generate a random RFID log entry
function generateRandomLog(date) {
  const student = students[Math.floor(Math.random() * students.length)];
  const building = buildings[Math.floor(Math.random() * buildings.length)];
  const action = Math.random() > 0.5 ? "entry" : "exit";
  const room = `Room ${Math.floor(Math.random() * 20) + 1}`;
  
  return {
    timestamp: Timestamp.fromDate(date),
    studentId: student.id,
    studentName: student.name,
    action: action,
    building: building.name,
    dormId: building.dormId,
    room: room,
    deviceId: `RFID-${Math.floor(Math.random() * 5) + 1}`
  };
}

// Generate logs for the past week
async function generateLogsForPastWeek() {
  const now = new Date();
  const logs = [];
  
  // Generate 50 logs for each student over the past week
  for (const student of students) {
    // Create more logs for the first few students to ensure they appear in top 5
    const numLogs = students.indexOf(student) < 5 ? 50 : 20;
    
    for (let i = 0; i < numLogs; i++) {
      const date = new Date();
      // Random time in the past week
      date.setHours(date.getHours() - Math.floor(Math.random() * 24 * 7));
      
      const log = {
        timestamp: Timestamp.fromDate(date),
        studentId: student.id,
        studentName: student.name,
        action: Math.random() > 0.5 ? "entry" : "exit",
        building: buildings[0].name, // Use first building for all logs
        dormId: buildings[0].dormId,
        room: `Room ${Math.floor(Math.random() * 20) + 1}`,
        deviceId: `RFID-${Math.floor(Math.random() * 5) + 1}`
      };
      
      logs.push(log);
    }
  }
  
  return logs;
}

// Add logs to Firestore
async function seedRfidLogs() {
  try {
    console.log("Generating RFID logs...");
    const logs = await generateLogsForPastWeek();
    console.log(`Generated ${logs.length} RFID logs`);
    
    // Check if we already have logs in the collection
    const existingLogsQuery = query(collection(db, 'rfidLogs'), limit(1));
    const existingLogsSnapshot = await getDocs(existingLogsQuery);
    
    if (!existingLogsSnapshot.empty) {
      console.log("RFID logs already exist in the database. Skipping seed operation.");
      console.log("If you want to add more logs, manually delete existing ones first.");
      return;
    }
    
    // Add logs to Firestore
    console.log("Adding logs to Firestore...");
    let successCount = 0;
    
    for (const log of logs) {
      try {
        await addDoc(collection(db, 'rfidLogs'), log);
        successCount++;
        
        // Log progress every 10 logs
        if (successCount % 10 === 0) {
          console.log(`Added ${successCount}/${logs.length} logs`);
        }
      } catch (error) {
        console.error("Error adding log:", error);
      }
    }
    
    console.log(`Successfully added ${successCount} RFID logs to Firestore`);
  } catch (error) {
    console.error("Error seeding RFID logs:", error);
  }
}

// Execute the seed function
seedRfidLogs()
  .then(() => {
    console.log("RFID logs seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
  }); 