"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { RfidLog } from "@/app/utils/admin-firestore";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper function to calculate duration between timestamps
const calculateDuration = (exitTime: string, entryTime: string): string => {
  try {
    let exitDate = new Date(exitTime.replace(' ', 'T'));
    let entryDate = new Date(entryTime.replace(' ', 'T'));
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1;
    if (isNaN(exitDate.getTime()) || exitDate.getFullYear() > maxValidYear ||
        isNaN(entryDate.getTime()) || entryDate.getFullYear() > maxValidYear) {
      const now = new Date();
      exitDate = now;
      entryDate = new Date(now.getTime() - 60 * 60 * 1000);
    }
    const diffMs = exitDate.getTime() - entryDate.getTime();
    if (diffMs <= 0) return '-';
    if (diffMs >= 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${minutes}m`;
    }
    if (diffMs >= 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    return `${seconds}s`;
  } catch (error) {
    return '-';
  }
};

export default function StandaloneRfidLogs() {
  const [logs, setLogs] = useState<RfidLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processedLogs, setProcessedLogs] = useState<(RfidLog & { duration: string })[]>([]);
  const [roomFilter, setRoomFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  
  // Auto-refresh every 10 seconds
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // Fetch logs directly from the API
        const response = await fetch('/api/rfid-logs', {
          headers: {
            // No authentication required for standalone display
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch logs: ${response.status}`);
        }
        
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (error) {
        console.error("Error fetching logs:", error);
        setLogs([]);
        toast.error("Failed to load logs");
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchLogs();
    
    // Set up auto-refresh
    const intervalId = setInterval(fetchLogs, 10000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Process logs to add duration
  const processLogs = (logsData: RfidLog[]) => {
    const studentLogs: Record<string, RfidLog[]> = {};
    logsData.forEach(log => {
      if (!studentLogs[log.studentId]) {
        studentLogs[log.studentId] = [];
      }
      studentLogs[log.studentId].push(log);
    });
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1;
    const processed = logsData.map(log => {
      let duration = '-';
      if (log.action === 'exit') {
        try {
          let exitDate = new Date(log.timestamp.replace(' ', 'T'));
          if (isNaN(exitDate.getTime()) || exitDate.getFullYear() > maxValidYear) {
            exitDate = new Date();
          }
          const studentLogsSorted = studentLogs[log.studentId]
            .filter(l => {
              let entryDate = new Date(l.timestamp.replace(' ', 'T'));
              if (isNaN(entryDate.getTime()) || entryDate.getFullYear() > maxValidYear) {
                entryDate = new Date(new Date().getTime() - 60 * 60 * 1000);
              }
              return l.action === 'entry' && entryDate < exitDate;
            })
            .sort((a, b) => {
              const dateA = new Date(a.timestamp.replace(' ', 'T')).getTime();
              const dateB = new Date(b.timestamp.replace(' ', 'T')).getTime();
              return dateB - dateA;
            });
          if (studentLogsSorted.length > 0) {
            const latestEntry = studentLogsSorted[0];
            duration = calculateDuration(log.timestamp, latestEntry.timestamp);
          }
        } catch (error) {
          duration = '-';
        }
      }
      return {
        ...log,
        duration
      };
    });
    return processed;
  };

  // Filter logs by search term
  const handleLogSearch = () => {
    if (!searchTerm.trim()) {
      setProcessedLogs(processLogs(logs));
      return;
    }
    const filtered = processLogs(logs).filter(log =>
      log.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.room || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProcessedLogs(filtered);
  };

  // Update processed logs when raw logs change
  useEffect(() => {
    setProcessedLogs(processLogs(logs));
  }, [logs]);

  // Helper to get unique rooms
  const getUniqueRooms = () => {
    const uniqueRooms = new Set<string>();
    logs.forEach(log => {
      const room = log.assignedRoom || log.userAssignedRoom || '';
      if (room && room.trim() !== '') {
        uniqueRooms.add(room);
      }
    });
    return Array.from(uniqueRooms);
  };

  // Apply filters
  const getFilteredLogs = () => {
    let filtered = processedLogs;
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter(log => (log.assignedRoom || log.userAssignedRoom || '') === roomFilter);
    }
    return filtered;
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">RFID Access Logs</h1>
        </div>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary">RFID Logs</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No logs found.</div>
            ) : (
              <div className="overflow-x-auto border border-secondary/20 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users, rooms..."
                      className="pl-10 border-secondary/20"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogSearch()}
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full md:w-[180px] border-secondary/20">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="entry">Entry Only</SelectItem>
                      <SelectItem value="exit">Exit Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={roomFilter} onValueChange={setRoomFilter}>
                    <SelectTrigger className="w-full md:w-[180px] border-secondary/20">
                      <SelectValue placeholder="All Rooms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rooms</SelectItem>
                      {getUniqueRooms().map(room => (
                        <SelectItem key={room} value={room}>{room}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-secondary/20">
                      <TableHead>User</TableHead>
                      <TableHead>Assigned Room</TableHead>
                      <TableHead>Assigned Building</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredLogs().map((log) => {
                      const dateObj = new Date(log.timestamp.replace(' ', 'T'));
                      const date = dateObj.toLocaleDateString();
                      const time = dateObj.toLocaleTimeString();
                      const assignedRoom = log.assignedRoom || log.userAssignedRoom || '';
                      const assignedBuilding = log.assignedBuilding || log.userAssignedBuilding || '';
                      return (
                        <TableRow key={log.id} className="border-secondary/20">
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.studentName}</div>
                              <div className="text-sm text-gray-500">{log.studentId}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignedRoom ? (
                              <div className="font-medium">{assignedRoom}</div>
                            ) : (
                              <div className="text-sm text-gray-500">Not assigned</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {assignedBuilding ? (
                              <div className="font-medium">
                                {assignedBuilding}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">Not assigned</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              log.action === 'entry'
                                ? 'bg-green-500'
                                : log.action === 'exit'
                                  ? 'bg-red-500'
                                  : 'bg-destructive'
                            }>
                              {log.action === 'entry' ? 'Entry' : log.action === 'exit' ? 'Exit' : log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-mono">{time}</div>
                              <div className="text-sm text-gray-500">{date}</div>
                            </div>
                          </TableCell>
                          <TableCell>{log.duration}</TableCell>
                        </TableRow>
                      );
                    })}
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