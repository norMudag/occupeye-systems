"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface UserData {
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  role: string;
  createdAt: string;
  assignedRoom?: string | null;
  assignedBuilding?: string | null;
  roomApplicationStatus?: string | null;
  roomApplicationId?: string | null;
  lastRoomApplication?: string | null;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  register: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      } else {
        console.log("No user data found in Firestore");
        setUserData(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserData(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      setCurrentUser(user);
      
      if (user) {
        // If user is logged in, fetch their data from Firestore
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserData(result.user.uid);
    return result.user;
  };

  const register = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setUserData(null);
  };

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 