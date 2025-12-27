"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUsers, User, getRooms, Room } from "@/app/utils/admin-firestore";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ManagerStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  managedBuildings: string[];
  roomCounts: Record<string, number>;
  studentCounts: Record<string, number>;
  availableOccupancy: Record<string, number>;
  totalRooms: number;
  totalStudents: number;
}

export default function AdminManagerList() {
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<ManagerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [buildings, setBuildings] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all managers
        const managerUsers = await getUsers("manager");
        // Get all rooms
        const allRooms = await getRooms();
        // Get all students
        const allStudents = await getUsers("student");

        // Extract unique buildings
        const uniqueBuildings = [...new Set(allRooms.map(room => room.building))];
        setBuildings(uniqueBuildings);

        // Process manager data with stats
        const managersWithStats = managerUsers.map((manager) => {
          const managedBuildings = manager.managedBuildings || [];
          const roomCounts: Record<string, number> = {};
          const studentCounts: Record<string, number> = {};
          const availableOccupancy: Record<string, number> = {};
          let totalRooms = 0;
          let totalStudents = 0;

          // Count rooms per building managed by this manager
          managedBuildings.forEach((building) => {
            const buildingRooms = allRooms.filter((room) => room.building === building);
            roomCounts[building] = buildingRooms.length;
            totalRooms += buildingRooms.length;

            // Count students in this building
            const buildingStudents = allStudents.filter(
              (student) => student.assignedBuilding === building
            );
            studentCounts[building] = buildingStudents.length;
            totalStudents += buildingStudents.length;

            // Calculate available occupancy
            const totalCapacity = buildingRooms.reduce((sum, room) => sum + room.capacity, 0);
            availableOccupancy[building] = totalCapacity - buildingStudents.length;
          });

          return {
            id: manager.id,
            firstName: manager.firstName,
            lastName: manager.lastName,
            email: manager.email,
            managedBuildings,
            roomCounts,
            studentCounts,
            availableOccupancy,
            totalRooms,
            totalStudents,
          };
        });

        setManagers(managersWithStats);
        setFilteredManagers(managersWithStats);
      } catch (error) {
        console.error("Error fetching manager data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters when search term or filters change
  useEffect(() => {
    let results = [...managers];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        manager => 
          manager.firstName.toLowerCase().includes(term) || 
          manager.lastName.toLowerCase().includes(term) ||
          manager.email.toLowerCase().includes(term) ||
          manager.managedBuildings.some(building => building.toLowerCase().includes(term))
      );
    }
    
    // Apply building filter
    if (buildingFilter !== "all") {
      results = results.filter(manager => 
        manager.managedBuildings.includes(buildingFilter)
      );
    }
    
    // Apply room filter
    if (roomFilter !== "all") {
      const minRooms = parseInt(roomFilter);
      results = results.filter(manager => {
        // If filtering by building, check rooms in that building
        if (buildingFilter !== "all") {
          return manager.roomCounts[buildingFilter] >= minRooms;
        }
        // Otherwise check total rooms
        return manager.totalRooms >= minRooms;
      });
    }
    
    setFilteredManagers(results);
  }, [searchTerm, buildingFilter, roomFilter, managers]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Manager List</h1>
          <p className="text-gray-600 mt-2">Overview of all managers, their buildings, rooms, and students</p>
        </div>

        {/* Filters */}
        <Card className="border-secondary/20 mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search managers..." 
                  className="pl-10 border-secondary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="border-secondary/20">
                    <SelectValue placeholder="Filter by building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(building => (
                      <SelectItem key={building} value={building}>{building}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="border-secondary/20">
                    <SelectValue placeholder="Filter by rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    <SelectItem value="5">5+ Rooms</SelectItem>
                    <SelectItem value="10">10+ Rooms</SelectItem>
                    <SelectItem value="20">20+ Rooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Managers</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">Loading managers...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/20">
                      <TableHead>Manager</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Rooms</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredManagers.length > 0 ? (
                      filteredManagers.map((manager) => (
                        manager.managedBuildings.length > 0 ? (
                          // If manager has buildings, show one row per building
                          manager.managedBuildings.map((building, index) => (
                            <TableRow key={`${manager.id}-${building}`} className="border-secondary/20">
                              {index === 0 ? (
                                // Only show manager name in the first row
                                <TableCell className="font-medium" rowSpan={manager.managedBuildings.length}>
                                  {manager.firstName} {manager.lastName}
                                </TableCell>
                              ) : null}
                              <TableCell>{building}</TableCell>
                              <TableCell>{manager.roomCounts[building] || 0}</TableCell>
                              <TableCell>{manager.studentCounts[building] || 0}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-3 border-secondary/20"
                                  asChild
                                >
                                  <Link href={`/admin/manager/view/${manager.id}?building=${encodeURIComponent(building)}`}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          // If manager has no buildings, show a single row
                          <TableRow key={manager.id} className="border-secondary/20">
                            <TableCell className="font-medium">{manager.firstName} {manager.lastName}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>0</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 border-secondary/20"
                                asChild
                              >
                                <Link href={`/admin/manager/view/${manager.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">No managers found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 