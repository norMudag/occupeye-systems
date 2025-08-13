"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getUsers, User, getRooms, Room } from "@/app/utils/admin-firestore";
import { Badge } from "@/components/ui/badge";

export default function AdminStudentList() {
  const [students, setStudents] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const users = await getUsers("student");
        const rooms = await getRooms();
        setStudents(users);
        setRooms(rooms);
      } catch (error) {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get room occupancy
  const getRoomOccupancy = (roomName: string | null | undefined, building: string | null | undefined) => {
    if (!roomName || !building) return "-";
    const room = rooms.find(
      (r) => r.name === roomName && r.building === building
    );
    return room ? `${room.currentOccupants} / ${room.capacity}` : "-";
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Student List</h1>
          <p className="text-gray-600 mt-2">Overview of all students and their room assignments</p>
        </div>
        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">Students</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">Loading students...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/20">
                      <TableHead>Student</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Room Occupancy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length > 0 ? (
                      students.map((student) => (
                        <TableRow key={student.id} className="border-secondary/20">
                          <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                          <TableCell>{student.assignedRoom || "-"}</TableCell>
                          <TableCell>{student.assignedBuilding || "-"}</TableCell>
                          <TableCell>
                            {getRoomOccupancy(student.assignedRoom, student.assignedBuilding)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">No students found</TableCell>
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