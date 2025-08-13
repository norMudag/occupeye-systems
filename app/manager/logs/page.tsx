"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Scan, DoorOpen, Search, User, Clock, Calendar, Building, RefreshCw } from "lucide-react";
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
      <Card className={`border-secondary/20 overflow-hidden transition-all hover:shadow-md ${isLarge ? 'col-span-full' : ''}`}>
        <CardContent className={`p-4 ${isLarge ? 'md:p-6' : ''}`}>
          <div className={`flex flex-col ${isLarge ? 'md:flex-row' : ''} gap-4`}>
            <div className={`flex items-center ${isLarge ? 'md:w-1/4' : ''} gap-4`}>
              <Avatar className={`${isLarge ? 'h-16 w-16' : 'h-12 w-12'} border-2 border-secondary`}>
                <AvatarImage 
                  src={"/placeholder-user.jpg"} 
                  alt={log.studentName} 
                />
                <AvatarFallback className={`bg-secondary text-black ${isLarge ? 'text-lg' : 'text-sm'} font-bold`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className={`font-medium ${isLarge ? 'text-lg' : ''}`}>{log.studentName}</div>
                <div className="text-sm text-gray-500">{log.studentId}</div>
               
              </div>
            </div>
            
            <div className={`flex flex-wrap gap-4 ${isLarge ? 'md:flex-1' : ''}`}>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Action</span>
                <Badge className={`mt-1 ${
                  log.action === 'entry'
                    ? 'bg-green-500'
                    : log.action === 'exit'
                      ? 'bg-red-500'
                      : 'bg-destructive'
                }`}>
                  {log.action === 'entry' ? 'Entry' : log.action === 'exit' ? 'Exit' : log.action}
                </Badge>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Room</span>
                <div className="flex items-center gap-1 mt-1">
                  <DoorOpen className="h-3 w-3 text-primary" />
                  <span className="font-medium">{assignedRoom || 'Not assigned'}</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Building</span>
                <div className="flex items-center gap-1 mt-1">
                  <Building className="h-3 w-3 text-primary" />
                  <span className="font-medium">{displayBuilding || 'Not assigned'}</span>
                </div>
              </div>
              
              {displayDormName && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Dormitory</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Building className="h-3 w-3 text-primary" />
                    <span className="font-medium">{displayDormName}</span>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Time</span>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-primary" />
                  <span className="font-mono">{time}</span>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Date</span>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="font-mono">{date}</span>
                </div>
              </div>
              
              {log.action === 'exit' && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Duration</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-primary" />
                    <span className="font-mono">{log.duration}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">RFID Access Logs</h1>
          <p className="text-gray-600 mt-2">
            {dormName ? `View RFID logs for ${dormName}` : "View RFID logs for your managed buildings"}
          </p>
        </div>

        {/* RFID Reader Card */}
        <Card className="border-secondary/20 mb-8">
          <CardHeader className="border-b border-secondary/20">
            <CardTitle className="text-primary flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              RFID Card Reader
            </CardTitle>
            <CardDescription>
              Scan RFID cards to verify access and record entries
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Automatic Detection</label>
                    <Badge className={`${rfidReaderStatus !== 'idle' ? "bg-success" : "bg-muted"} text-white`}>
                      {rfidReaderStatus === 'idle' ? 'OFF' : rfidReaderStatus === 'processing' ? 'Processing' : 'Listening'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {isListening ? "Enabled" : "Disabled"}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={toggleListening}
                      className="h-8"
                    >
                      {isListening ? "Disable" : "Enable"}
                    </Button>
                  </div>
                </div>
                
                {isListening && currentBuffer.length > 0 && (
                  <div className="bg-secondary/5 border border-secondary/20 rounded p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Scan className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-sm font-medium">Detecting input...</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearBuffer}
                        className="h-6 px-2"
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-mono bg-background/50 p-1 rounded overflow-x-auto whitespace-nowrap">
                        {currentBuffer.length > 20 
                          ? `${currentBuffer.substring(0, 8)}...${currentBuffer.substring(currentBuffer.length - 8)}`
                          : currentBuffer}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">RFID Card Value</label>
                  <div className="relative">
                    <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={isListening ? "Scan card or enter value manually..." : "Enter RFID card value..."}
                      className="pl-10 border-secondary/20"
                      value={rfidValue}
                      onChange={(e) => setRfidValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRfidRead()}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room ID (Optional)</label>
                  <div className="relative">
                    <DoorOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter room ID or name..."
                      className="pl-10 border-secondary/20"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRfidRead()}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID (Optional)</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Enter user ID..."
                      className="pl-10 border-secondary/20"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRfidRead()}
                    />
                  </div>
                </div>
                <Button 
                  className="w-full"
                  onClick={handleRfidRead}
                  disabled={rfidLoading}
                >
                  {rfidLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Scan className="h-4 w-4 mr-2" />
                      {isListening ? "Scan or Read RFID Card" : "Read RFID Card"}
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-secondary/10 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-primary">RFID Reader Instructions</h3>
                <ol className="space-y-2 text-sm text-gray-600 pl-5 list-decimal">
                  <li>{isListening ? 
                      <strong>Automatic Detection Enabled: Just scan your RFID card</strong> :
                      "Enter the RFID card value from the scanner"}
                  </li>
                  <li>Optionally specify the room ID for the access point</li>
                  <li>Optionally specify the user ID to include in logs</li>
                  <li>{isListening ? 
                      "The system will automatically process scanned cards" :
                      "Click \"Read RFID Card\" or press Enter to process"}
                  </li>
                  <li>The system will verify the card and log the access attempt</li>
                  <li>Results will appear in the logs below</li>
                </ol>
                <div className="text-xs text-gray-500 mt-4">
                  {isListening ?
                    <p>Auto-detection is active. The system is listening for card scanner input.</p> :
                    <p>Auto-detection is disabled. Manual input required.</p>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader className="border-b border-secondary/20">
            <div className="flex justify-between items-center">
              <div>
            <CardTitle className="text-primary">RFID Logs</CardTitle>
            {dormName && (
              <CardDescription>
                Showing access logs for {dormName}
              </CardDescription>
            )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {dormName 
                  ? `No logs found for ${dormName}.` 
                  : "No logs found for your managed buildings."}
                
                {userData?.managedDormId && (
                  <div className="mt-4 p-4 bg-secondary/5 rounded-md border border-secondary/20 max-w-md mx-auto">
                    <h4 className="text-sm font-medium mb-2">Manager Dormitory Information</h4>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Managed Dorm ID:</span>
                        <span className="font-mono">{userData.managedDormId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dormitory Name:</span>
                        <span className="font-medium">{dormName || "Not found"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Managed Buildings:</span>
                        <span className="font-medium">{userData.managedBuildings?.join(", ") || "None"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users, rooms..."
                      className="pl-10 border-secondary/20"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!e.target.value.trim()) {
                          fetchLogs();
                        }
                      }}
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
                
                <div className="space-y-6">
                  {/* Most recent log - large card */}
                  {getFilteredLogs().length > 0 && renderLogCard(getFilteredLogs()[0], true)}
                  
                  {/* Other logs - grid of smaller cards */}
                  {getFilteredLogs().length > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getFilteredLogs().slice(1, 7).map((log) => (
                        <div key={log.id}>
                          {renderLogCard(log)}
                        </div>
                      ))}
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