// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; 