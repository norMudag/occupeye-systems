"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserById, getRooms, Room, getUsers, User } from "@/app/utils/admin-firestore";

interface RoomWithOccupancy extends Room {
  currentOccupants: number;
  availableSlots: number;
}

interface BuildingStats {
  name: string;
  rooms: RoomWithOccupancy[];
  totalCapacity: number;
  totalOccupied: number;
  totalAvailable: number;
}

export default function ManagerView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const managerId = params.id as string;
  const initialBuilding = searchParams.get("building");
  
  const [manager, setManager] = useState<User | null>(null);
  const [buildingStats, setBuildingStats] = useState<Record<string, BuildingStats>>({});
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(initialBuilding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get manager details
        const managerData = await getUserById(managerId);
        if (!managerData) {
          console.error("Manager not found");
          return;
        }
        setManager(managerData);

        // Get all rooms
        const allRooms = await getRooms();
        
        // Get all students
        const allStudents = await getUsers("student");
        
        // Process building stats
        const buildingStatsMap: Record<string, BuildingStats> = {};
        
        // Filter to only buildings managed by this manager
        const managedBuildings = managerData.managedBuildings || [];
        
        managedBuildings.forEach(buildingName => {
          // Get rooms in this building
          const buildingRooms = allRooms.filter(room => room.building === buildingName);
          
          // Use Firestore's currentOccupants for occupancy
          const roomsWithOccupancy: RoomWithOccupancy[] = buildingRooms.map(room => {
            const availableSlots = Math.max(0, room.capacity - room.currentOccupants);
            return {
              ...room,
              currentOccupants: room.currentOccupants, // use Firestore value
              availableSlots
            };
          });
          
          // Sort rooms by name for consistent display
          roomsWithOccupancy.sort((a, b) => a.name.localeCompare(b.name));
          
          // Calculate building totals
          const totalCapacity = roomsWithOccupancy.reduce((sum, room) => sum + room.capacity, 0);
          const totalOccupied = roomsWithOccupancy.reduce((sum, room) => sum + room.currentOccupants, 0);
          const totalAvailable = totalCapacity - totalOccupied;
          
          buildingStatsMap[buildingName] = {
            name: buildingName,
            rooms: roomsWithOccupancy,
            totalCapacity,
            totalOccupied,
            totalAvailable
          };
        });
        
        setBuildingStats(buildingStatsMap);
        
        // If no building is selected but we have buildings, select the first one
        if (!selectedBuilding && managedBuildings.length > 0) {
          setSelectedBuilding(managedBuildings[0]);
        }
      } catch (error) {
        console.error("Error fetching manager data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [managerId, initialBuilding]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading manager details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Button variant="outline" className="mb-4" asChild>
            <Link href="/admin/manager">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Managers
            </Link>
          </Button>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-destructive">Manager Not Found</h2>
            <p className="text-gray-600 mt-2">The manager you're looking for doesn't exist or has been removed.</p>
          </div>
        </main>
      </div>
    );
  }

  const managedBuildings = manager.managedBuildings || [];
  const currentBuilding = selectedBuilding && buildingStats[selectedBuilding] 
    ? buildingStats[selectedBuilding] 
    : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Button variant="outline" className="mb-4" asChild>
          <Link href="/admin/manager">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Managers
          </Link>
        </Button>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Manager Details</h1>
          <p className="text-gray-600 mt-2">View details for {manager.firstName} {manager.lastName}</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Manager Info Card */}
          <div className="lg:col-span-3">
            <Card className="border-secondary/20">
              <CardHeader className="border-b border-secondary/20">
                <CardTitle className="text-primary">Manager Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{manager.firstName} {manager.lastName}</h3>
                    <p className="text-sm text-gray-500">{manager.email}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Manager ID</p>
                    <p className="font-mono">{manager.managerId || "Not assigned"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Buildings Managed</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {managedBuildings.length > 0 ? (
                        managedBuildings.map(building => (
                          <Badge 
                            key={building} 
                            variant="outline" 
                            className={`cursor-pointer ${selectedBuilding === building ? 'bg-primary text-white' : 'bg-secondary/10'}`}
                            onClick={() => setSelectedBuilding(building)}
                          >
                            {building}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-gray-500">No buildings assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Building Details */}
          <div className="lg:col-span-9">
            {currentBuilding ? (
              <Card className="border-secondary/20">
                <CardHeader className="border-b border-secondary/20">
                  <CardTitle className="text-primary flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    {currentBuilding.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-secondary/10 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Total Capacity</p>
                      <p className="text-2xl font-bold">{currentBuilding.totalCapacity}</p>
                    </div>
                    <div className="p-4 bg-secondary/10 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Occupied Slots</p>
                      <p className="text-2xl font-bold">{currentBuilding.totalOccupied}</p>
                    </div>
                    <div className="p-4 bg-secondary/10 rounded-lg text-center">
                      <p className="text-sm text-gray-500">Available Slots</p>
                      <p className="text-2xl font-bold">{currentBuilding.totalAvailable}</p>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-4">Rooms in {currentBuilding.name}</h3>
                  
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-secondary/20">
                          <TableHead className="w-1/5">Room</TableHead>
                          <TableHead className="w-1/5">Capacity</TableHead>
                          <TableHead className="w-1/5">Occupied</TableHead>
                          <TableHead className="w-1/5">Available Slots</TableHead>
                          <TableHead className="w-1/5">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentBuilding.rooms.map(room => (
                          <TableRow key={room.id} className="border-secondary/20">
                            <TableCell className="font-medium">{room.name}</TableCell>
                            <TableCell>{room.currentOccupants}/{room.capacity}</TableCell>
                            <TableCell>{room.currentOccupants}</TableCell>
                            <TableCell>
                              <Badge className={
                                room.availableSlots > 2 
                                  ? "bg-success text-white" 
                                  : room.availableSlots > 0 
                                  ? "bg-warning text-white" 
                                  : "bg-gray-400 text-white"
                              }>
                                {room.availableSlots} slots
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                room.status === "available" 
                                  ? "bg-success/10 text-success border-success/20" 
                                  : "bg-destructive/10 text-destructive border-destructive/20"
                              }>
                                {room.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-secondary/20">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    {managedBuildings.length > 0 
                      ? "Select a building to view details" 
                      : "This manager has no buildings assigned"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 