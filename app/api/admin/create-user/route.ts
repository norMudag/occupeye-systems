import { NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    const { email, password, userData } = body;
    
    if (!email || !password || !userData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      email, 
      password
    );
    
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Sign out the newly created user to prevent auto sign-in
    await auth.signOut();
    
    return NextResponse.json({ success: true, userId: user.uid });
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
} 