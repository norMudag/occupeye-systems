import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { RfidLog } from '@/app/utils/admin-firestore';

export async function GET(request: NextRequest) {
  try {
    // Get logs (limited to last 100)
    const logsQuery = await adminDb.collection('rfidLogs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    const logs: RfidLog[] = [];
    logsQuery.forEach(doc => {
      logs.push({ 
        id: doc.id,
        ...doc.data() 
      } as RfidLog);
    });
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error in RFID logs API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 