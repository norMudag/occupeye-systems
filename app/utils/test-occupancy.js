// Test script to check room occupancy for a specific dormitory
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Function to test occupancy calculation for a specific dormitory
async function testOccupancyCalculation(dormId) {
  console.log(`Testing occupancy calculation for dormitory ID: ${dormId}`);
  
  try {
    // Get all rooms for the specified dormitory
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('dormId', '==', dormId)
    );
    
    const roomsSnap = await getDocs(roomsQuery);
    console.log(`Found ${roomsSnap.size} rooms for dormId: ${dormId}`);
    
    // Calculate occupancy statistics
    let totalRooms = roomsSnap.size;
    let totalCapacity = 0;
    let currentOccupants = 0;
    let occupantIds = new Set();
    
    // Process each room
    roomsSnap.forEach(doc => {
      const roomData = doc.data();
      console.log(`Room ${doc.id}:`, {
        name: roomData.name,
        capacity: roomData.capacity,
        currentOccupants: roomData.currentOccupants,
        occupantIds: roomData.occupantIds?.length || 0
      });
      
      // Add to total capacity
      const capacity = parseInt(roomData.capacity) || 0;
      totalCapacity += capacity;
      
      // Count current occupants
      const roomOccupants = parseInt(roomData.currentOccupants) || 0;
      currentOccupants += roomOccupants;
      
      // Collect unique occupant IDs
      if (roomData.occupantIds && Array.isArray(roomData.occupantIds)) {
        roomData.occupantIds.forEach(id => {
          if (id) occupantIds.add(id);
        });
      }
    });
    
    // Calculate occupancy rate
    const overallOccupancy = totalCapacity > 0 
      ? Math.round((currentOccupants / totalCapacity) * 100) 
      : 0;
    
    console.log("Occupancy calculation results:", {
      totalRooms,
      totalCapacity,
      currentOccupants,
      uniqueOccupants: occupantIds.size,
      overallOccupancy: `${overallOccupancy}%`,
      calculation: `${currentOccupants} / ${totalCapacity} * 100 = ${overallOccupancy}%`
    });
    
    return {
      totalRooms,
      totalCapacity,
      currentOccupants,
      uniqueOccupants: occupantIds.size,
      overallOccupancy
    };
  } catch (error) {
    console.error("Error in test script:", error);
    return null;
  }
}

// Export the function for use in other files
export { testOccupancyCalculation };

// If this file is run directly, execute the test
if (typeof window !== 'undefined') {
  const dormId = 'rSX3ZyMhUm0wYtgmSLQv';
  console.log(`Running occupancy test for dormitory ${dormId}...`);
  testOccupancyCalculation(dormId)
    .then(results => {
      console.log('Test completed:', results);
    })
    .catch(error => {
      console.error('Test failed:', error);
    });
} 