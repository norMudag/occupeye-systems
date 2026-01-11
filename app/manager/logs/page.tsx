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
  managedBuildings?: string[]; // Optional for students
  managedDormId?: string;      // Optional for students
  assignedBuilding?: string;   // Add this for students
  [key: string]: any;
}

// Helper function to calculate duration between timestamps using UTC+8 time (Philippine time)


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
  const [viewMode, setViewMode] = useState<'all' | 'returned' | 'not-returned'>('all');
  const [notReturnedList, setNotReturnedList] = useState<(RfidLog & { duration: string })[]>([]);
  const [returnedList, setReturnedList] = useState<(RfidLog & { duration: string })[]>([]);

  // Get the global RFID service
  const { 
    lastScanResult 
  } = useRfidService();

  // Add state for user ID
  const [userId, setUserId] = useState("");

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

// Updated helper for 1 person per entry
const getNotReturnedStudents = (allProcessedLogs: (RfidLog & { duration: string })[]) => {
  const latestStatus: Record<string, (RfidLog & { duration: string })> = {};

  // Sort logs by timestamp oldest to newest so the loop ends with the latest scan
  const sortedByTime = [...allProcessedLogs].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sortedByTime.forEach(log => {
    // This overwrites previous scans, leaving only the most recent one for each student
    latestStatus[log.studentId] = log;
  });

  // Return only those whose absolute last scan was an 'exit'
  return Object.values(latestStatus)
    .filter(log => log.action === 'exit')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

useEffect(() => {
  const processed = processLogs(logs);
  setProcessedLogs(processed);

  // Map to store the absolute latest log for each studentId
  const latestStudentStatus = new Map<string, (RfidLog & { duration: string })>();

  // Sort oldest to newest so the last entry in the map is the current status
  [...processed]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .forEach(log => {
      latestStudentStatus.set(log.studentId, log);
    });

  const allLatest = Array.from(latestStudentStatus.values());

  // 1 Person per entry: Last action was 'exit'
  const currentlyOut = allLatest
    .filter(log => log.action === 'exit')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 1 Person per entry: Last action was 'entry'
  const currentlyIn = allLatest
    .filter(log => log.action === 'entry')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  setNotReturnedList(currentlyOut);
  setReturnedList(currentlyIn);
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


   // ---------- TIMEZONE SAFE PARSING ----------
  const parsePhilTime = (val?: string | Date | null): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    const s = String(val);
    // already ISO with timezone?
    if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) return new Date(s);
    // convert "YYYY-MM-DD HH:mm:ss" → ISO
    const iso = s.includes("T") ? s : s.replace(" ", "T");
    return new Date(`${iso}+08:00`);
  };

  // ---------- DURATION CALC ----------
  const calculateDuration = (
    exitTime: string | Date,
    entryTime: string | Date
  ): string => {
    try {
      const exitDate = parsePhilTime(exitTime) ?? new Date();
      const entryDate =
        parsePhilTime(entryTime) ??
        new Date(exitDate.getTime() - 60 * 60 * 1000);

      const diffMs = exitDate.getTime() - entryDate.getTime();
      if (diffMs <= 0) return "-";

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${Math.max(1, seconds)}s`;
    } catch {
      return "-";
    }
  };

  // ---------- FETCH ----------
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const managedBuildings = userData?.managedBuildings || [];
      let dormNameFetched = "";

      if (userData?.managedDormId) {
        try {
          const dormData = await getDormById(userData.managedDormId);
          if (dormData) {
            dormNameFetched = dormData.name;
            setDormName(dormData.name);
          }
        } catch (error) {
          console.error("Error fetching dorm data:", error);
        }
      }

      // ✅ fetch ALL actions (entry + exit) so duration works
      const allLogs = await getRfidLogs({
        limit: 500,
        room: roomFilter !== "all" ? roomFilter : undefined,
        dormName: dormNameFetched,
      });

      const filteredLogs = allLogs.filter((log) => {
        if (
          dormNameFetched &&
          (log.dormName === dormNameFetched ||
            log.building === dormNameFetched)
        ) {
          return true;
        }
        return log.building && managedBuildings.includes(log.building);
      });

      // ✅ apply search if any
      if (searchTerm.trim()) {
        const searchTermLower = searchTerm.toLowerCase();
        const searchResults = filteredLogs.filter(
          (log) =>
            log.studentId.toLowerCase().includes(searchTermLower) ||
            log.studentName.toLowerCase().includes(searchTermLower) ||
            (log.room || "").toLowerCase().includes(searchTermLower)
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

  useEffect(() => {
    fetchLogs();
  }, [roomFilter]);

  useEffect(() => {
    setProcessedLogs(processLogs(logs));
  }, [logs]);

  const getFilteredLogs = () => {
    let filtered = [...processedLogs];
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
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
          isLarge ? "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 " : "hover:border-primary/20"
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
                  {log.studentId} | <Phone className="h-3.5 w-3.5 text-primary mr-2"/>{log.contactNumber}
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
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">RFID Access Logs</h1>
          <p className="text-base text-muted-foreground">Real-time dormitory access monitoring system</p>
        </div>

        <Card className="border shadow-md">
          <CardHeader className="border-b bg-primary/5 px-4 py-3">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <CardTitle className="text-xl text-primary">RFID Access Logs</CardTitle>
                <CardDescription className="text-sm mt-1">Showing access logs for managed buildings</CardDescription>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users, rooms..."
                    className="pl-9 h-10 text-sm border"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      if (!e.target.value.trim()) fetchLogs()
                    }}
                  />
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[160px] h-10 text-sm">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="entry">Entry Only</SelectItem>
                    <SelectItem value="exit">Exit Only</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant={viewMode === 'all' ? "default" : "outline"} 
                  onClick={() => setViewMode('all')}
                  className="h-10 bg-white shadow-sm"
                >
                  Show All Logs
                </Button>

                <div className="flex bg-gray-100 p-1 rounded-lg border">
                  <Button 
                    variant={viewMode === 'returned' ? "secondary" : "ghost"} 
                    onClick={() => setViewMode('returned')}
                    className={viewMode === 'returned' ? "bg-white shadow-sm text-green-600" : ""}
                  >
                    <LogIn className="mr-2 h-4 w-4" /> Returned ({returnedList.length})
                  </Button>
                  <Button 
                    variant={viewMode === 'not-returned' ? "secondary" : "ghost"} 
                    onClick={() => setViewMode('not-returned')}
                    className={viewMode === 'not-returned' ? "bg-white shadow-sm text-red-600" : ""}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Not Returned ({notReturnedList.length})
                  </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={loading}
                  className="flex items-center gap-2 h-10 px-4"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loading ? (
              <div className="text-center py-10">
                <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Loading logs...</p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* CASE 1: NOT RETURNED (Unique 1-per-person currently OUT) */}
                {viewMode === 'not-returned' ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-red-600 flex items-center gap-2">
                      <LogOut className="h-5 w-5" />
                      Students Currently Out ({notReturnedList.length})
                    </h2>
                    {notReturnedList.length === 0 ? (
                      <p className="text-center py-10 text-gray-500 italic">Everyone is inside.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notReturnedList.map((log) => (
                          <div key={`unique-out-${log.studentId}`}>{renderLogCard(log)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : viewMode === 'returned' ? (
                  /* CASE 2: RETURNED (Unique 1-per-person currently IN) */
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-green-600 flex items-center gap-2">
                      <LogIn className="h-5 w-5" />
                      Students Currently Inside ({returnedList.length})
                    </h2>
                    {returnedList.length === 0 ? (
                      <p className="text-center py-10 text-gray-500 italic">No students are currently inside.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {returnedList.map((log) => (
                          <div key={`unique-in-${log.studentId}`}>{renderLogCard(log)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* CASE 3: SHOW ALL LOGS (Full Historical Activity) */
                  <div className="space-y-6">
                    {getFilteredLogs().length === 0 ? (
                      <div className="text-center py-10 text-gray-600">
                        <Activity className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold mb-1">No logs found</h3>
                      </div>
                    ) : (
                      <>
                        <div>
                          <h2 className="text-lg font-semibold mb-2 text-primary">Latest Access</h2>
                          {renderLogCard(getFilteredLogs()[0], true)}
                        </div>
                        {getFilteredLogs().length > 1 && (
                          <div>
                            <h2 className="text-lg font-semibold mb-3 text-primary">Recent Activity History</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {getFilteredLogs().slice(1, 10).map((log) => (
                                <div key={log.id}>{renderLogCard(log)}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 