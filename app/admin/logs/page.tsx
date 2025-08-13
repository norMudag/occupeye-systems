"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Activity, Search, RefreshCw, DoorOpen, Calendar, Clock, User, Building, TrendingUp, CreditCard, Scan, CheckCircle } from "lucide-react"
import { 
  getRfidLogs, 
  RfidLog
} from "@/app/utils/admin-firestore"
import { toast } from "sonner"
import { useRfidService } from "@/lib/RfidService"

// Helper function to calculate duration between timestamps using UTC+8 time (Philippine time)
const calculateDuration = (exitTime: string, entryTime: string): string => {
  try {
    // Convert timestamps to Date objects
    let exitDate = new Date(exitTime.replace(' ', 'T'));
    let entryDate = new Date(entryTime.replace(' ', 'T'));
    
    // Check for invalid or future dates
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1; // Allow at most next year
    
    if (isNaN(exitDate.getTime()) || exitDate.getFullYear() > maxValidYear || 
        isNaN(entryDate.getTime()) || entryDate.getFullYear() > maxValidYear) {
      
      console.warn("Invalid or future date detected in duration calculation");
      
      // Use current time minus 1 hour for entry and current time for exit as fallback
      const now = new Date();
      exitDate = now;
      entryDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    }
    
    // Calculate difference in milliseconds directly without timezone adjustment
    // Since both dates are processed the same way, the relative difference remains accurate
    const diffMs = exitDate.getTime() - entryDate.getTime();
    
    // If negative or zero, return dash
    if (diffMs <= 0) return '-';
    
    // Format as hours and minutes if over 60 minutes
    if (diffMs >= 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
      return `${hours}h ${minutes}m`;
    }
    
    // Format as minutes if over 60 seconds
    if (diffMs >= 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      const seconds = Math.floor((diffMs % (60 * 1000)) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    
    // Format as seconds - calculate the actual seconds
    const seconds = Math.max(1, Math.floor(diffMs / 1000)); // Ensure at least 1 second
    return `${seconds}s`;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return '-';
  }
};

export default function RfidLogs() {
  // State variables
  const [logs, setLogs] = useState<RfidLog[]>([])
  const [processedLogs, setProcessedLogs] = useState<(RfidLog & { duration: string, status: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [buildingFilter, setBuildingFilter] = useState('all')
  const [rfidValue, setRfidValue] = useState("")
  const [roomId, setRoomId] = useState("")
  const [rfidLoading, setRfidLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all-logs')
  const [showOnlyWithHousing, setShowOnlyWithHousing] = useState(false)
  const [roomFilter, setRoomFilter] = useState('all')
  
  // Get the global RFID service
  const { 
    isListening, 
    status: rfidReaderStatus, 
    toggleListening, 
    currentBuffer, 
    clearBuffer,
    lastScanResult 
  } = useRfidService();
  
  // Fetch data on component mount
  useEffect(() => {
    fetchLogs()
  }, [])
  
  // Refresh logs when a new RFID card is scanned
  useEffect(() => {
    if (lastScanResult?.success) {
      fetchLogs(actionFilter !== 'all' ? actionFilter : undefined)
    }
  }, [lastScanResult, actionFilter])

  // Process logs to add duration and status
  const processLogs = (logsData: RfidLog[]) => {
    // Group logs by studentId to track entry and exit pairs
    const studentLogs: Record<string, RfidLog[]> = {};
    
    // First, group all logs by student ID
    logsData.forEach(log => {
      if (!studentLogs[log.studentId]) {
        studentLogs[log.studentId] = [];
      }
      studentLogs[log.studentId].push(log);
    });
    
    // Current year for validation
    const currentYear = new Date().getFullYear();
    const maxValidYear = currentYear + 1; // Allow at most next year
    
    // Process each student's logs to calculate durations
    const processed = logsData.map(log => {
      let duration = '-';
      let status = 'Active';
      
      if (log.action === 'exit') {
        try {
          // Find the most recent entry for this student before this exit
          let exitDate = new Date(log.timestamp.replace(' ', 'T'));
          
          // Check if exit date is valid
          if (isNaN(exitDate.getTime()) || exitDate.getFullYear() > maxValidYear) {
            // Use current time as fallback
            exitDate = new Date();
          }
          
          const studentLogsSorted = studentLogs[log.studentId]
            .filter(l => {
              let entryDate = new Date(l.timestamp.replace(' ', 'T'));
              
              // Check if entry date is valid
              if (isNaN(entryDate.getTime()) || entryDate.getFullYear() > maxValidYear) {
                // Use time 1 hour ago as fallback
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
            // Found a matching entry, calculate duration
            const latestEntry = studentLogsSorted[0];
            duration = calculateDuration(log.timestamp, latestEntry.timestamp);
            status = 'Completed';
          }
        } catch (error) {
          console.error("Error processing log:", error);
          duration = '-';
          status = 'Error';
        }
      }
      
      return {
        ...log,
        duration,
        status
      };
    });
    
    return processed;
  };

  const fetchLogs = async (action?: string) => {
    try {
      setLoading(true)
      const filters: {
        action?: string;
        limit: number;
      } = { limit: 50 }
      
      if (action && action !== 'all') {
        filters.action = action
      }
      
      const logsData = await getRfidLogs(filters)
      setLogs(logsData)
      
      // Process logs to add duration and status
      const processed = processLogs(logsData);
      setProcessedLogs(processed);
    } catch (error) {
      console.error("Error fetching RFID logs:", error)
      toast.error("Failed to load logs")
    } finally {
      setLoading(false)
    }
  }

  // Handle filtering logs by action
  const handleActionFilter = async (action: string) => {
    setActionFilter(action)
    fetchLogs(action !== 'all' ? action : undefined)
  }

  // Handle log search
  const handleLogSearch = async () => {
    if (!searchTerm.trim()) {
      fetchLogs(actionFilter !== 'all' ? actionFilter : undefined)
      return
    }
    
    try {
      setLoading(true)
      // Client-side filtering
      const filters: {
        action?: string;
        limit: number;
      } = { limit: 100 }
      
      if (actionFilter !== 'all') {
        filters.action = actionFilter
      }
      
      const allLogs = await getRfidLogs(filters)
      const filteredLogs = allLogs.filter(log => 
        log.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.room.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      setLogs(filteredLogs.slice(0, 50)) // Limit to 50 results
      
      // Process filtered logs
      const processed = processLogs(filteredLogs.slice(0, 50));
      setProcessedLogs(processed);
    } catch (error) {
      console.error("Error searching logs:", error)
      toast.error("Search failed")
    } finally {
      setLoading(false)
    }
  }

  // Handle RFID card reading
  const handleRfidRead = async () => {
    try {
      if (!rfidValue.trim()) {
        toast.error("Please enter an RFID value")
        return
      }
      
      setRfidLoading(true)
      
      // Call the API endpoint to process the RFID reading
      const response = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfidValue: rfidValue.trim(),
          roomId: roomId.trim() || undefined,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        toast.error(data.error || "Failed to process RFID card")
        return
      }
      
      // Display success message with user info
      if (data.success) {
        toast.success(`Access ${data.logEntry.action} for ${data.user.firstName} ${data.user.lastName}`)
        // Refresh logs to show the new entry
        fetchLogs(actionFilter !== 'all' ? actionFilter : undefined)
      } else {
        toast.error("Access denied")
      }
    } catch (error) {
      console.error("Error processing RFID:", error)
      toast.error("Failed to process RFID card")
    } finally {
      setRfidLoading(false)
      // Clear the RFID input field
      setRfidValue("")
    }
  }

  // Format timestamp for better display using UTC+8 time (Philippine time)
  const formatTimestamp = (timestamp: string): { date: string; time: string } => {
    try {
      let dateObj;
      
      // Check if the timestamp is valid
      if (!timestamp || timestamp === 'Unknown') {
        // Use current date and time if timestamp is invalid
        dateObj = new Date();
      } else {
        // Convert the timestamp to a Date object
        dateObj = new Date(timestamp.replace(' ', 'T'));
        
        // If the date is invalid or in the future, use current date
        if (isNaN(dateObj.getTime()) || dateObj.getFullYear() > new Date().getFullYear() + 1) {
          console.warn("Invalid or future date detected, using current date instead:", timestamp);
          dateObj = new Date();
        }
      }
      
      // Convert to UTC+8 time (Philippine time)
      const utcTime = dateObj.getTime();
      const utcPlus8Time = new Date(utcTime + (8 * 60 * 60 * 1000)); // Add 8 hours in milliseconds
      
      // Format date as YYYY-MM-DD
      const year = utcPlus8Time.getUTCFullYear();
      const month = String(utcPlus8Time.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcPlus8Time.getUTCDate()).padStart(2, '0');
      const datePart = `${year}-${month}-${day}`;
      
      // Format time as HH:MM:SS
      const hours = String(utcPlus8Time.getUTCHours()).padStart(2, '0');
      const minutes = String(utcPlus8Time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(utcPlus8Time.getUTCSeconds()).padStart(2, '0');
      const timePart = `${hours}:${minutes}:${seconds}`;
      
      return {
        date: datePart,
        time: timePart
      };
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      // Use current date and time as fallback
      const now = new Date();
      const utcPlus8Time = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      
      const year = utcPlus8Time.getUTCFullYear();
      const month = String(utcPlus8Time.getUTCMonth() + 1).padStart(2, '0');
      const day = String(utcPlus8Time.getUTCDate()).padStart(2, '0');
      const datePart = `${year}-${month}-${day}`;
      
      const hours = String(utcPlus8Time.getUTCHours()).padStart(2, '0');
      const minutes = String(utcPlus8Time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(utcPlus8Time.getUTCSeconds()).padStart(2, '0');
      const timePart = `${hours}:${minutes}:${seconds}`;
      
      return {
        date: datePart,
        time: timePart
      };
    }
  };

  // Extract unique users from logs for filtering
  const getUniqueUsers = () => {
    const uniqueUsers = new Set<string>();
    logs.forEach(log => {
      uniqueUsers.add(log.studentName);
    });
    return Array.from(uniqueUsers);
  }

  // Helper to get unique, non-empty buildings
  const getUniqueBuildings = () => {
    const uniqueBuildings = new Set<string>();
    logs.forEach(log => {
      const building = log.assignedBuilding || log.userAssignedBuilding || '';
      if (building && building.trim() !== '') {
        uniqueBuildings.add(building.split(' - ')[0]);
      }
    });
    return Array.from(uniqueBuildings);
  };

  // Helper to get unique rooms based on selected building
  const getUniqueRooms = (selectedBuilding: string) => {
    const uniqueRooms = new Set<string>();
    logs.forEach(log => {
      const building = log.assignedBuilding || log.userAssignedBuilding || '';
      const room = log.assignedRoom || log.userAssignedRoom || '';
      if (room && room.trim() !== '') {
        if (!selectedBuilding || selectedBuilding === 'all' || building.split(' - ')[0] === selectedBuilding) {
          uniqueRooms.add(room);
        }
      }
    });
    return Array.from(uniqueRooms);
  };

  // Update getFilteredLogs to filter by building and room
  const getFilteredLogs = () => {
    let filtered = processedLogs;
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(log => (log.assignedBuilding || log.userAssignedBuilding || '').split(' - ')[0] === buildingFilter);
    }
    if (roomFilter !== 'all') {
      filtered = filtered.filter(log => (log.assignedRoom || log.userAssignedRoom || '') === roomFilter);
    }
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.studentName === userFilter);
    }
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }
    if (searchTerm.trim()) {
      filtered = filtered.filter(log => 
        log.studentId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.room.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">RFID Access Logs</h1>
        <p className="text-gray-600 text-xs">Monitor and manage RFID card access events</p>
      </div>

      <Card className="border-secondary/20 mb-6">
        <CardHeader className="border-b border-secondary/20 py-3">
          <CardTitle className="text-primary text-base flex items-center">
            <CreditCard className="h-4 w-4 mr-2" />
            RFID Card Reader
          </CardTitle>
          <CardDescription className="text-xs">
            Scan RFID cards to verify access and record entries
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-medium">Automatic Detection</label>
                  <Badge className={`${rfidReaderStatus !== 'idle' ? "bg-success" : "bg-muted"} text-white text-xs`}>
                    {rfidReaderStatus === 'idle' ? 'OFF' : rfidReaderStatus === 'processing' ? 'Processing' : 'Listening'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {isListening ? "Enabled" : "Disabled"}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleListening}
                    className="h-7 text-xs"
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
            <div className="bg-secondary/10 p-3 rounded-lg space-y-2">
              <h3 className="font-semibold text-primary text-sm">RFID Reader Instructions</h3>
              <ol className="space-y-1 text-xs text-gray-600 pl-4 list-decimal">
                <li>{isListening ? 
                    <strong>Automatic Detection Enabled: Just scan your RFID card</strong> :
                    "Enter the RFID card value from the scanner"}
                </li>
                <li>Optionally specify the room ID for the access point</li>
                <li>{isListening ? 
                    "The system will automatically process scanned cards" :
                    "Click \"Read RFID Card\" or press Enter to process"}
                </li>
                <li>The system will verify the card and log the access attempt</li>
                <li>Results will appear in the logs table below</li>
              </ol>
              <div className="text-xs text-gray-500 mt-3">
                {isListening ?
                  <p>Auto-detection is active. The system is listening for card scanner input.</p> :
                  <p>Auto-detection is disabled. Manual input required.</p>
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-lg font-bold text-primary mb-1">All RFID Logs</h2>
        <p className="text-gray-600 text-xs">Complete history of user access events with advanced filtering</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
          <Input
            placeholder="Search users, rooms..."
            className="pl-8 border-secondary/20 h-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogSearch()}
          />
        </div>
        
        <Select value={actionFilter} onValueChange={handleActionFilter}>
          <SelectTrigger className="w-full md:w-[150px] border-secondary/20 h-8 text-xs">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Actions</SelectItem>
            <SelectItem value="entry" className="text-xs">Entry Only</SelectItem>
            <SelectItem value="exit" className="text-xs">Exit Only</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={userFilter} onValueChange={(value) => setUserFilter(value)}>
          <SelectTrigger className="w-full md:w-[150px] border-secondary/20 h-8 text-xs">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            {getUniqueUsers().map(user => (
              <SelectItem key={user} value={user}>{user}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={buildingFilter} onValueChange={(value) => {
          setBuildingFilter(value);
          setRoomFilter('all'); // Reset room filter when building changes
        }}>
          <SelectTrigger className="w-full md:w-[150px] border-secondary/20 h-8 text-xs">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {getUniqueBuildings().map(building => (
              <SelectItem key={building} value={building}>{building}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-full md:w-[150px] border-secondary/20 h-8 text-xs">
            <SelectValue placeholder="All Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {getUniqueRooms(buildingFilter).map(room => (
              <SelectItem key={room} value={room}>{room}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        Showing {getFilteredLogs().length} of {processedLogs.length} log entries
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading logs...</p>
        </div>
      ) : getFilteredLogs().length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-secondary/20">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No logs found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || actionFilter !== 'all' || userFilter !== 'all' || buildingFilter !== 'all' || roomFilter !== 'all'
              ? 'No logs match your search criteria' 
              : 'There are no RFID access logs in the system yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-secondary/20 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="border-secondary/20">
                <TableHead className="text-xs font-medium">User</TableHead>
                <TableHead className="text-xs font-medium">Assigned Room</TableHead>
                <TableHead className="text-xs font-medium">Assigned Building</TableHead>
                <TableHead className="text-xs font-medium">Action</TableHead>
                <TableHead className="text-xs font-medium">Timestamp</TableHead>
                <TableHead className="text-xs font-medium">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getFilteredLogs().map((log) => {
                const { date, time } = formatTimestamp(log.timestamp);
                const roomParts = log.room.split(' - ');
                const assignedRoom = log.assignedRoom || log.userAssignedRoom || '';
                const assignedBuilding = log.assignedBuilding || log.userAssignedBuilding || '';
                return (
                  <TableRow key={log.id} className="border-secondary/20">
                    <TableCell className="py-2">
                      <div>
                        <div className="font-medium text-xs">{log.studentName}</div>
                        <div className="text-xs text-gray-500">{log.studentId}</div>
                        <Badge className="mt-1 bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Student</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {assignedRoom ? (
                        <div className="font-medium text-xs">{assignedRoom}</div>
                      ) : (
                        <div className="text-xs text-gray-500">Not assigned</div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {assignedBuilding ? (
                        <div className="font-medium text-xs">{assignedBuilding}</div>
                      ) : (
                        <div className="text-xs text-gray-500">Not assigned</div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
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
                    <TableCell className="py-2">
                      <div>
                        <div className="font-mono text-xs">{time}</div>
                        <div className="text-xs text-gray-500">{date}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {log.duration}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
} 