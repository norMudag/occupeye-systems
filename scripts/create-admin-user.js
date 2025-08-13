// Script to create an admin user
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");

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
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdminUser() {
  const email = "admin@gmail.com";
  const password = "admin123";
  
  try {
    // Check if user already exists
    console.log(`Attempting to create admin user: ${email}`);
    
    // Create user with Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Set admin role in Firestore
    await setDoc(doc(db, "users", user.uid), {
      firstName: "Admin",
      lastName: "User",
      studentId: "ADMIN",
      email: email,
      role: "admin",
      createdAt: new Date().toISOString()
    });
    
    console.log(`Successfully created admin user with UID: ${user.uid}`);
    console.log("Email: admin@gmail.com");
    console.log("Password: admin123");
    console.log("Role: admin");
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      console.log("Admin email already exists. Checking if it's an admin...");
      
      // Try to log in and update the role
      try {
        // We can't log in programmatically without the password for security reasons
        // Just inform the user what to do
        console.log("Email already exists. Please log in and manually update the user role to 'admin' in the Firestore database.");
      } catch (loginError) {
        console.error("Error during login attempt:", loginError);
      }
    } else {
      console.error("Error creating admin user:", error);
    }
  }
}

createAdminUser(); 