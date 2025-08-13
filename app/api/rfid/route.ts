import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { notifyRfidAccess } from '@/app/utils/notification-service';

interface LogEntry {
  id: string;
  studentId: string;
  studentName: string;
  room: string;
  action: string;
  timestamp: any;
  timestampMillis: number;
}

// Helper function to get current timestamp in UTC+8
const getCurrentUtcPlus8Timestamp = (): Timestamp => {
  // Get current time
  const now = new Date();
  
  // Adjust for UTC+8 (Philippine time)
  // This doesn't affect the actual Timestamp in Firestore, but helps with any local processing
  // Firestore Timestamp is always stored in UTC format
  return Timestamp.fromDate(now);
};

// Helper function to update user status based on RFID action
const updateUserStatus = async (userId: string, action: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Update the user's status to match their RFID action (entry or exit)
    await updateDoc(userRef, {
      status: action,
      lastUpdated: getCurrentUtcPlus8Timestamp()
    });
    
    console.log(`User ${userId} status updated to ${action}`);
  } catch (error) {
    console.error(`Error updating user ${userId} status:`, error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { rfidValue, roomId, userId } = data;

    if (!rfidValue) {
      return NextResponse.json(
        { error: 'RFID value is required' },
        { status: 400 }
      );
    }

    // 1. Find user with matching RFID card
    const usersQuery = query(
      collection(db, 'users'),
      where('rfidCard', '==', rfidValue)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      // No user found with this RFID card
      // Log an access denied event
      if (roomId) {
        await addDoc(collection(db, 'rfidLogs'), {
          studentId: 'Unknown',
          studentName: 'Unknown',
          room: roomId,
          action: 'denied',
          timestamp: getCurrentUtcPlus8Timestamp(),
          userId: userId || null // Include provided userId
        });
      }
      
      return NextResponse.json(
        { error: 'No user found with this RFID card', success: false },
        { status: 404 }
      );
    }

    // 2. Get user data
    const userData = usersSnapshot.docs[0].data();
    const userDocId = usersSnapshot.docs[0].id;
    const studentId = userData.studentId || userDocId;
    
    // 3. Get room information if roomId is provided
    let roomData = null;
    let dormId = null;
    let dormName = null;
    
    if (roomId) {
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('id', '==', roomId)
      );
      
      const roomsSnapshot = await getDocs(roomsQuery);
      if (!roomsSnapshot.empty) {
        roomData = roomsSnapshot.docs[0].data();
        dormId = roomData.dormId || null;
        
        // If room has dormId, get the dorm name
        if (dormId) {
          try {
            const dormQuery = query(
              collection(db, 'dorms'),
              where('id', '==', dormId)
            );
            const dormSnapshot = await getDocs(dormQuery);
            if (!dormSnapshot.empty) {
              dormName = dormSnapshot.docs[0].data().name || null;
            }
          } catch (error) {
            console.error("Error fetching dorm data:", error);
          }
        }
      }
    }
    
    // If dormId is still null but user has assignedBuilding, try to find dormId by building name
    if (!dormId && userData.assignedBuilding) {
      try {
        const dormQuery = query(
          collection(db, 'dorms'),
          where('name', '==', userData.assignedBuilding)
        );
        const dormSnapshot = await getDocs(dormQuery);
        if (!dormSnapshot.empty) {
          dormId = dormSnapshot.docs[0].id;
          dormName = userData.assignedBuilding;
        }
      } catch (error) {
        console.error("Error finding dorm by building name:", error);
      }
    }
    
    // If user is a manager, use their managedDormId
    if (userData.managedDormId) {
      dormId = userData.managedDormId;
      
      // Try to get the dorm name if not already set
      if (!dormName) {
        try {
          const dormDoc = doc(db, 'dorms', dormId);
          const dormSnapshot = await getDocs(query(collection(db, 'dorms'), where('id', '==', dormId)));
          if (!dormSnapshot.empty) {
            dormName = dormSnapshot.docs[0].data().name;
          }
        } catch (error) {
          console.error("Error fetching manager's dorm name:", error);
        }
      }
    }

    // 4. Check the student's last action to determine if this should be entry or exit
    let action = 'entry'; // Default action is entry
    
    try {
      // Get all logs for this student (we'll do client-side sorting)
      const logsQuery = query(
        collection(db, 'rfidLogs'),
        where('studentId', '==', studentId)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      
      if (!logsSnapshot.empty) {
        // Convert to array and sort by timestamp (newest first)
        const logs: LogEntry[] = logsSnapshot.docs.map(doc => {
          const data = doc.data();
          // If timestamp is a Firestore Timestamp, convert to milliseconds for sorting
          const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp.toMillis() 
            : new Date(data.timestamp).getTime();
          
          return {
            ...(data as any),
            id: doc.id,
            timestampMillis: timestamp
          };
        });
        
        // Sort by timestamp (descending)
        logs.sort((a, b) => b.timestampMillis - a.timestampMillis);
        
        // Use the most recent log to determine the next action
        if (logs.length > 0) {
          const lastLog = logs[0];
          // Toggle between entry and exit based on last action
          if (lastLog.action === 'entry') {
            action = 'exit';
          } else if (lastLog.action === 'exit') {
            action = 'entry';
          }
          // If last action was 'denied', we'll keep the default 'entry'
        }
      }
    } catch (error) {
      console.error("Error determining action type:", error);
      // If there's an error in this section, default to 'entry'
      action = 'entry';
    }
    
    // 5. Create an RFID log entry with the determined action
    const logEntry = {
      studentId: studentId,
      studentName: `${userData.firstName} ${userData.lastName}`,
      room: roomId || userData.assignedRoom || 'Unknown',
      building: userData.assignedBuilding || null,
      dormId: dormId || userData.managedDormId || null, // Use the dormId we found or manager's dormId
      dormName: dormName || userData.assignedBuilding || null, // Use the dormName we found or assigned building
      action,
      timestamp: getCurrentUtcPlus8Timestamp(),
      // Include user's assigned room and building information
      userAssignedRoom: userData.assignedRoom || null,
      userAssignedBuilding: userData.assignedBuilding || null,
      userRoomApplicationStatus: userData.roomApplicationStatus || null,
      // Include the user ID from the request if provided, otherwise use the document ID
      userId: userId || userDocId
    };
    
    await addDoc(collection(db, 'rfidLogs'), logEntry);
    
    // 6. Update the user's status based on this action
    await updateUserStatus(userDocId, action);

    // 7. Send notification to the student
    try {
      const roomName = roomId || userData.assignedRoom || 'Unknown';
      const buildingName = userData.assignedBuilding || 'Unknown Building';
      
      await notifyRfidAccess(
        userDocId,
        action as 'entry' | 'exit',
        roomName,
        buildingName
      );
    } catch (notificationError) {
      console.error('Error sending RFID notification:', notificationError);
      // Continue execution even if notification fails
    }

    // 8. Return user information along with success status
    return NextResponse.json({
      success: true,
      user: {
        id: userDocId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        studentId: userData.studentId,
        rfidCard: userData.rfidCard,
        role: userData.role,
        status: action // Return the updated status
      },
      room: roomData,
      logEntry
    });

  } catch (error) {
    console.error('Error processing RFID request:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
} 