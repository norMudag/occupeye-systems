"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Scan, DoorOpen, Search, User, Clock, Calendar, Building, RefreshCw, Activity, LogIn, LogOut, MapPin, Shield, Phone } from "lucide-react";
import Navigation from "@/components/navigation";
import { getRfidLogs, RfidLog, getDormById } from "@/app/utils/admin-firestore";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useRfidService } from "@/lib/RfidService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Extend UserData to include managedBuildings for type safety
interface ManagerUserData {
  managedBuildings: string[];
  managedDormId?: string;
  [key: string]: any;
}

// Helper function to calculate duration between timestamps using UTC+8 time (Philippine time)
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

export default function ManagerRfidLogs() {
  const { userData } = useAuth() as { userData: ManagerUserData | null };
  const [logs, setLogs] = useState<RfidLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [rfidValue, setRfidValue] = useState("");
  const [roomId, setRoomId] = useState("");
  const [rfidLoading, setRfidLoading] = useState(false);
  const [processedLogs, setProcessedLogs] = useState<(RfidLog & { duration: string })[]>([]);
  const [roomFilter, setRoomFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dormName, setDormName] = useState<string>("");
  
  // Get the global RFID service
  const { 
    isListening, 
    status: rfidReaderStatus, 
    toggleListening, 
    currentBuffer, 
    clearBuffer,
    lastScanResult 
  } = useRfidService();

  // Add state for user ID
  const [userId, setUserId] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Get the managed buildings for filtering
      const managedBuildings = userData?.managedBuildings || [];
      
      // Get the managed dorm name if managedDormId exists
      let dormName = "";
      if (userData?.managedDormId) {
        try {
          const dormData = await getDormById(userData.managedDormId);
          if (dormData) {
            dormName = dormData.name;
            setDormName(dormData.name);
            console.log("Manager's dormitory name:", dormName);
          }
        } catch (error) {
          console.error("Error fetching dorm data:", error);
        }
      }
      
      // Use the filter parameters in the getRfidLogs function
      const allLogs = await getRfidLogs({ 
        limit: 100,
        room: roomFilter !== 'all' ? roomFilter : undefined,
        action: actionFilter !== 'all' ? actionFilter : undefined,
        dormName: dormName // Add dormName as a filter parameter
      });
      
      console.log(`Fetched ${allLogs.length} logs total, filtering for dormName: ${dormName}`);
      
      // Filter logs for manager's managed buildings or managed dorm
      const filteredLogs = allLogs.filter(
        (log) => {
          // If we have a dorm name, include logs with that dormName field
          if (dormName && (log.dormName === dormName || log.building === dormName)) {
            return true;
          }
          
          // Also include logs from managed buildings
          return log.building && managedBuildings.includes(log.building);
        }
      );
      
      console.log(`Filtered to ${filteredLogs.length} logs for dormName: ${dormName}`);
      
      // Apply search term filter if provided
      if (searchTerm.trim()) {
        const searchTermLower = searchTerm.toLowerCase();
        const searchResults = filteredLogs.filter(log =>
          log.studentId.toLowerCase().includes(searchTermLower) ||
          log.studentName.toLowerCase().includes(searchTermLower) ||
          (log.room || '').toLowerCase().includes(searchTermLower)
        );
        setLogs(searchResults);
      } else {
        setLogs(filteredLogs);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

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

  // Add this function after processLogs and before useEffect
  const handleLogSearch = () => {
    fetchLogs();
  };

  // Update useEffect to refetch logs when filters change
  useEffect(() => {
    if (userData) fetchLogs();
  }, [userData, roomFilter, actionFilter, searchTerm]);

  // Refresh logs when a new RFID card is scanned
  useEffect(() => {
    if (lastScanResult?.success && userData) {
      fetchLogs();
    }
  }, [lastScanResult, userData]);

  // Process logs to add duration when logs change
  useEffect(() => {
    setProcessedLogs(processLogs(logs));
  }, [logs]);

  // Handle RFID card reading with room ID
  const handleRfidRead = async () => {
    try {
      if (!rfidValue.trim()) {
        toast.error("Please enter an RFID value");
        return;
      }
      
      setRfidLoading(true);
      
      // Call the API endpoint to process the RFID reading
      const response = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfidValue: rfidValue.trim(),
          roomId: roomId.trim() || undefined,
          userId: userId.trim() || undefined, // Include user ID in the request
      
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || "Failed to process RFID card");
        return;
      }
      
      // Display success message with user info
      if (data.success) {
        toast.success(`Access ${data.logEntry.action} for ${data.user.firstName} ${data.user.lastName}`);
        // Refresh logs to show the new entry
        fetchLogs();
      } else {
        toast.error("Access denied");
      }
    } catch (error) {
      console.error("Error processing RFID:", error);
      toast.error("Failed to process RFID card");
    } finally {
      setRfidLoading(false);
      // Clear the RFID input field
      setRfidValue("");
    }
  };

  // Helper to get unique rooms from manager's managed buildings
  const getUniqueRooms = () => {
    const uniqueRooms = new Set<string>();
    logs.forEach(log => {
      const building = log.assignedBuilding || log.userAssignedBuilding || '';
      const room = log.assignedRoom || log.userAssignedRoom || '';
      
      // Include rooms from managed buildings or the managed dorm
      if (room && room.trim() !== '' && 
          (userData?.managedBuildings?.includes(building) || 
           (dormName && building === dormName))) {
        uniqueRooms.add(room);
      }
    });
    return Array.from(uniqueRooms);
  };

  // Update getFilteredLogs to filter by action and room
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

  // Helper function to render a log card
  const renderLogCard = (log: RfidLog & { duration: string }, isLarge: boolean = false) => {
    const dateObj = new Date(log.timestamp.replace(' ', 'T'));
    const date = dateObj.toLocaleDateString();
    const time = dateObj.toLocaleTimeString();
    const assignedRoom = log.assignedRoom || log.userAssignedRoom || '';
    const assignedBuilding = log.assignedBuilding || log.userAssignedBuilding || '';
    // Use the dorm name if the building matches
    const displayBuilding = (dormName && assignedBuilding === dormName) ? dormName : assignedBuilding;
    // Use log.dormName if available
    const displayDormName = log.dormName || dormName || '';
    const initials = log.studentName ? `${log.studentName.split(' ')[0][0] || ''}${log.studentName.split(' ')[1]?.[0] || ''}` : 'NA';
    
    return (
    <Card
        key={log.id}
        className={`border-2 hover:shadow-xl transition-all duration-300 ${
          isLarge ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" : "hover:border-primary/20"
        }`}
      >
        <CardHeader className={`pb-4 ${isLarge ? "pb-6" : ""}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`${isLarge ? "h-16 w-16" : "h-12 w-12"} bg-primary/10 rounded-full flex items-center justify-center`}
              >
                <User className={`${isLarge ? "h-8 w-8" : "h-6 w-6"} text-primary`} />
              </div>
              <div>
                <CardTitle className={`${isLarge ? "text-2xl" : "text-lg"}`}>{log.studentName}</CardTitle>
                <CardDescription className={`${isLarge ? "text-base" : "text-sm"}`}>
                  <div className="flex items-center gap-2">
                  {log.studentId} | <Phone/>{log.contactNumber}
                  </div>
                  </CardDescription>
              </div>
            </div>
            <Badge
              className={`${
                log.action === "entry"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : log.action === "exit"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-destructive"
              } ${isLarge ? "text-lg px-4 py-2" : "text-sm px-3 py-1"}`}
            >
              {log.action === "entry" ? (
                <>
                  <LogIn className={`${isLarge ? "h-5 w-5" : "h-4 w-4"} mr-1`} />
                  Entry
                </>
              ) : log.action === "exit" ? (
                <>
                  <LogOut className={`${isLarge ? "h-5 w-5" : "h-4 w-4"} mr-1`} />
                  Exit
                </>
              ) : (
                log.action
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className={`space-y-${isLarge ? "6" : "4"}`}>
          <div className={`grid grid-cols-2 gap-${isLarge ? "6" : "4"}`}>
            <div className="flex items-center gap-3">
              <MapPin className={`${isLarge ? "h-6 w-6" : "h-4 w-4"} text-muted-foreground`} />
              <div>
                <p className={`${isLarge ? "text-base" : "text-sm"} font-medium`}>Room</p>
                <p className={`${isLarge ? "text-base" : "text-sm"} text-muted-foreground`}>
                  {assignedRoom || "Not assigned"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className={`${isLarge ? "h-6 w-6" : "h-4 w-4"} text-muted-foreground`} />
              <div>
                <p className={`${isLarge ? "text-base" : "text-sm"} font-medium`}>Building</p>
                <p className={`${isLarge ? "text-base" : "text-sm"} text-muted-foreground`}>
                  {assignedBuilding || "Not assigned"}
                </p>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-${isLarge ? "6" : "4"} pt-${isLarge ? "4" : "2"} border-t`}>
            <div className="flex items-center gap-3">
              <Clock className={`${isLarge ? "h-6 w-6" : "h-4 w-4"} text-muted-foreground`} />
              <div>
                <p className={`${isLarge ? "text-base" : "text-sm"} font-medium`}>Time</p>
                <p className={`font-mono ${isLarge ? "text-lg" : "text-sm"}`}>{time}</p>
                <p className={`${isLarge ? "text-sm" : "text-xs"} text-muted-foreground`}>{date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Activity className={`${isLarge ? "h-6 w-6" : "h-4 w-4"} text-muted-foreground`} />
              <div>
                <p className={`${isLarge ? "text-base" : "text-sm"} font-medium`}>Duration</p>
                <p className={`${isLarge ? "text-2xl" : "text-lg"} font-bold text-primary`}>{log.duration}</p>
              </div>
            </div>
          </div>

          <div className={`pt-${isLarge ? "4" : "2"} border-t`}>
            <Badge variant="outline" className={`${isLarge ? "text-sm" : "text-xs"}`}>
              Student Access
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  
  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">RFID Access Logs</h1>
          <p className="text-2xl text-muted-foreground">Real-time dormitory access monitoring system</p>
        </div>

        <Card className="border-2 border-primary/20 shadow-xl">
          <CardHeader className="border-b border-primary/20 bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-3xl text-primary">RFID Access Logs</CardTitle>
                <CardDescription className="text-lg mt-2">Showing access logs for managed buildings</CardDescription>
              </div>

              <div className="flex flex-col md:flex-row gap-6 mb-10">
                                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    <Input
                      placeholder="Search users, rooms..."
                      className="pl-14 h-16 text-xl border-2 border-primary/20"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        if (!e.target.value.trim()) {
                          fetchLogs()
                        }
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleLogSearch()}
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-full md:w-[220px] h-16 text-xl border-2 border-primary/20">
                      <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="entry">Entry Only</SelectItem>
                      <SelectItem value="exit">Exit Only</SelectItem>
                    </SelectContent>
                  </Select>
                
            
              
              <Button
                variant="outline"
                size="lg"
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 text-lg px-6 py-3 h-auto bg-transparent"
              >
                      
                <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
                </div>
            </div>
          </CardHeader>

          <CardContent className="pt-8">
            {loading ? (
              <div className="text-center py-20">
                <div className="h-20 w-20 rounded-full border-6 border-primary border-t-transparent animate-spin mx-auto mb-8"></div>
                <p className="text-2xl text-gray-600">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-gray-600">
                <Activity className="h-24 w-24 text-gray-400 mx-auto mb-8" />
                <h3 className="text-3xl font-semibold mb-4">No logs found</h3>
                <p className="text-xl">No logs found for your managed buildings.</p>
              </div>
            ) : (
              <div>
   

                <div className="space-y-8">
                  {/* Most recent log - large featured card */}
                  {getFilteredLogs().length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-semibold mb-4 text-primary">Latest Access</h2>
                      {renderLogCard(getFilteredLogs()[0], true)}
                    </div>
                  )}

                  {/* Other logs - grid of smaller cards */}
                  {getFilteredLogs().length > 1 && (
                    <div>
                      <h2 className="text-2xl font-semibold mb-6 text-primary">Recent Activity</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {getFilteredLogs()
                          .slice(1, 7)
                          .map((log) => (
                            <div key={log.id}>{renderLogCard(log)}</div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 