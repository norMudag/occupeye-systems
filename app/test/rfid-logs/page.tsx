"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { collection, addDoc, serverTimestamp, getDoc, doc, query, orderBy, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { getRFIDActivityDataByDorm } from "@/app/utils/manager-firestore"
import { getAuth } from "firebase/auth"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function RfidLogsTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    studentId: "ST1001",
    studentName: "John Smith",
    action: "entry",
    building: "Building A",
    dormId: "rSX3ZyMhUm0wYtgmSLQv",
    room: "Room 101",
    deviceId: "RFID-001"
  })
  
  // Add state for manager's dormitory info
  const [managerInfo, setManagerInfo] = useState({
    userId: "",
    dormId: "",
    dormName: "",
    building: ""
  })
  
  // Add state for RFID activity data
  const [rfidData, setRfidData] = useState<{
    hours: string[];
    entryData: number[];
    exitData: number[];
    alerts: any[];
    topTenants: any[];
  }>({
    hours: [],
    entryData: [],
    exitData: [],
    alerts: [],
    topTenants: []
  })
  
  // Add state for time range
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')
  
  // Fetch manager info on page load
  useEffect(() => {
    const fetchManagerInfo = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
          setError("No authenticated user found. Please log in.");
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          setError("User document not found.");
          return;
        }
        
        const userData = userDoc.data();
        const managedDormId = userData.managedDormId;
        
        if (!managedDormId) {
          setError("No dormitory assigned to this manager.");
          return;
        }
        
        // Get dormitory details
        const dormDoc = await getDoc(doc(db, 'dormitories', managedDormId));
        let dormName = '';
        let building = '';
        
        if (dormDoc.exists()) {
          const dormData = dormDoc.data();
          dormName = dormData.name || '';
          building = dormData.building || dormName;
        }
        
        setManagerInfo({
          userId: user.uid,
          dormId: managedDormId,
          dormName,
          building
        });
        
        // Update form data with the manager's dormitory info
        setFormData(prev => ({
          ...prev,
          dormId: managedDormId,
          building: building || dormName
        }));
        
      } catch (err) {
        console.error("Error fetching manager info:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      }
    };
    
    fetchManagerInfo();
  }, []);
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    
    try {
      // Add document to rfidLogs collection
      await addDoc(collection(db, "rfidLogs"), {
        ...formData,
        timestamp: serverTimestamp()
      })
      
      setSuccess("RFID log entry created successfully!")
    } catch (err) {
      console.error("Error creating RFID log:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }
  
  const createMultipleEntries = async () => {
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    
    try {
      const count = 10
      const actions = ["entry", "exit"]
      const results = []
      
      for (let i = 0; i < count; i++) {
        // Alternate between entry and exit
        const action = actions[i % 2]
        
        // Add document to rfidLogs collection
        const result = await addDoc(collection(db, "rfidLogs"), {
          ...formData,
          action,
          timestamp: serverTimestamp()
        })
        
        results.push(result.id)
      }
      
      setSuccess(`Created ${count} RFID log entries (alternating entry/exit)`)
    } catch (err) {
      console.error("Error creating multiple RFID logs:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }
  
  const createLogsForMultipleStudents = async () => {
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    
    try {
      const students = [
        { id: "ST1001", name: "John Smith" },
        { id: "ST1002", name: "Maria Garcia" },
        { id: "ST1003", name: "David Lee" },
        { id: "ST1004", name: "Sarah Johnson" },
        { id: "ST1005", name: "Ahmed Hassan" }
      ]
      
      let totalLogs = 0
      
      // Create 5-10 logs for each student
      for (const student of students) {
        const logsCount = Math.floor(Math.random() * 6) + 5 // 5-10 logs
        
        for (let i = 0; i < logsCount; i++) {
          const action = Math.random() > 0.5 ? "entry" : "exit"
          
          await addDoc(collection(db, "rfidLogs"), {
            studentId: student.id,
            studentName: student.name,
            action,
            building: formData.building,
            dormId: formData.dormId,
            room: `Room ${Math.floor(Math.random() * 20) + 101}`,
            deviceId: `RFID-${Math.floor(Math.random() * 5) + 1}`,
            timestamp: serverTimestamp()
          })
          
          totalLogs++
        }
      }
      
      setSuccess(`Created ${totalLogs} RFID log entries for ${students.length} students`)
    } catch (err) {
      console.error("Error creating student RFID logs:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }
  
  const createLogsWithDormName = async () => {
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    
    try {
      const students = [
        { id: "ST1001", name: "John Smith" },
        { id: "ST1002", name: "Maria Garcia" },
        { id: "ST1003", name: "David Lee" },
        { id: "ST1004", name: "Sarah Johnson" },
        { id: "ST1005", name: "Ahmed Hassan" }
      ]
      
      if (!managerInfo.dormName) {
        setError("Dormitory name not available. Please make sure you are logged in as a manager with an assigned dormitory.");
        setIsLoading(false);
        return;
      }
      
      let totalLogs = 0;
      
      // Create 5-10 logs for each student with dormName field
      for (const student of students) {
        const logsCount = Math.floor(Math.random() * 6) + 5; // 5-10 logs
        
        for (let i = 0; i < logsCount; i++) {
          const action = Math.random() > 0.5 ? "entry" : "exit";
          
          await addDoc(collection(db, "rfidLogs"), {
            studentId: student.id,
            studentName: student.name,
            action,
            building: formData.building,
            dormId: formData.dormId,
            dormName: managerInfo.dormName, // Add dormName field
            room: `Room ${Math.floor(Math.random() * 20) + 101}`,
            deviceId: `RFID-${Math.floor(Math.random() * 5) + 1}`,
            timestamp: serverTimestamp()
          });
          
          totalLogs++;
        }
      }
      
      setSuccess(`Created ${totalLogs} RFID log entries with dormName field for ${students.length} students`);
    } catch (err) {
      console.error("Error creating RFID logs with dormName:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to test the getRFIDActivityDataByDorm function
  const testGetRFIDActivityDataByDorm = async () => {
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    
    try {
      console.log(`Testing getRFIDActivityDataByDorm with timeRange: ${timeRange}`);
      const data = await getRFIDActivityDataByDorm(timeRange);
      console.log("RFID Activity Data:", data);
      
      setRfidData(data);
      setSuccess(`Successfully retrieved RFID activity data for time range: ${timeRange}`);
    } catch (err) {
      console.error("Error testing getRFIDActivityDataByDorm:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add function to fetch existing RFID logs
  const fetchExistingLogs = async () => {
    setIsLoading(true);
    setSuccess(null);
    setError(null);
    
    try {
      // Get logs from Firestore
      const logsRef = collection(db, "rfidLogs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Existing RFID logs:", logs);
      
      // Display success message
      setSuccess(`Found ${logs.length} RFID logs`);
      
      // Add a section to display the logs in the UI
      return logs;
    } catch (err) {
      console.error("Error fetching RFID logs:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // State to store existing logs
  const [existingLogs, setExistingLogs] = useState<any[]>([]);
  
  // Fetch logs on page load
  useEffect(() => {
    const getLogs = async () => {
      const logs = await fetchExistingLogs();
      setExistingLogs(logs);
    };
    
    if (managerInfo.dormId) {
      getLogs();
    }
  }, [managerInfo.dormId]);
  
  // Refresh logs after creating new ones
  useEffect(() => {
    if (success && success.includes("Created")) {
      fetchExistingLogs().then(logs => setExistingLogs(logs));
    }
  }, [success]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">RFID Logs Test Page</h1>
      
      {success && (
        <Alert className="mb-6 bg-success/10 border-success">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert className="mb-6 bg-destructive/10 border-destructive">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Manager's Dormitory Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Manager's Dormitory Information</CardTitle>
          <CardDescription>Information about your assigned dormitory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">User ID</Label>
              <p className="font-mono text-sm">{managerInfo.userId || "Not available"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Dormitory ID</Label>
              <p className="font-mono text-sm">{managerInfo.dormId || "Not assigned"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Dormitory Name</Label>
              <p>{managerInfo.dormName || "Not available"}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Building</Label>
              <p>{managerInfo.building || "Not available"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Test getRFIDActivityDataByDorm Function */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test getRFIDActivityDataByDorm Function</CardTitle>
          <CardDescription>Test the function that retrieves RFID activity data for your dormitory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-40">
                <Label htmlFor="timeRange" className="mb-2 block">Time Range</Label>
                <Select 
                  value={timeRange}
                  onValueChange={(value) => setTimeRange(value as 'today' | 'week' | 'month')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={testGetRFIDActivityDataByDorm}
                disabled={isLoading}
                className="mt-6"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : "Test Function"}
              </Button>
            </div>
            
            {rfidData.topTenants.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Top Tenants</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Exits</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rfidData.topTenants.map((tenant, index) => (
                      <TableRow key={tenant.studentId || index}>
                        <TableCell className="font-mono text-xs">
                          {tenant.studentId}
                        </TableCell>
                        <TableCell>
                          {tenant.studentName || 'Unknown'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-success">{tenant.entries}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-warning">{tenant.exits}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {tenant.totalActivity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {rfidData.hours.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Activity Data</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Time Periods</Label>
                    <p className="font-mono text-xs">{rfidData.hours.join(', ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Entry Data</Label>
                    <p className="font-mono text-xs">{rfidData.entryData.join(', ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Exit Data</Label>
                    <p className="font-mono text-xs">{rfidData.exitData.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Display existing RFID logs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Existing RFID Logs</CardTitle>
          <CardDescription>Recent RFID log entries with dormName field</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={fetchExistingLogs}
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : "Fetch Existing Logs"}
          </Button>
          {existingLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Dorm ID</TableHead>
                    <TableHead>Dorm Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{log.id}</TableCell>
                      <TableCell className="font-mono text-xs">{log.studentId}</TableCell>
                      <TableCell>{log.studentName || 'Unknown'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.building}</TableCell>
                      <TableCell className="font-mono text-xs">{log.dormId}</TableCell>
                      <TableCell>{log.dormName || 'N/A'}</TableCell>
                      <TableCell>{log.room}</TableCell>
                      <TableCell className="font-mono text-xs">{log.deviceId}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.timestamp?.toDate ? 
                          log.timestamp.toDate().toLocaleString() : 
                          typeof log.timestamp === 'string' ? 
                            log.timestamp : 
                            'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No existing RFID logs found. Create some using the form above!</p>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Single RFID Log Entry</CardTitle>
            <CardDescription>Manually add an entry to the rfidLogs collection</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input 
                    id="studentId" 
                    value={formData.studentId}
                    onChange={(e) => handleChange("studentId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentName">Student Name</Label>
                  <Input 
                    id="studentName" 
                    value={formData.studentName}
                    onChange={(e) => handleChange("studentName", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select 
                    value={formData.action}
                    onValueChange={(value) => handleChange("action", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry</SelectItem>
                      <SelectItem value="exit">Exit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="building">Building</Label>
                  <Input 
                    id="building" 
                    value={formData.building}
                    onChange={(e) => handleChange("building", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dormId">Dorm ID</Label>
                  <Input 
                    id="dormId" 
                    value={formData.dormId}
                    onChange={(e) => handleChange("dormId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room">Room</Label>
                  <Input 
                    id="room" 
                    value={formData.room}
                    onChange={(e) => handleChange("room", e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input 
                  id="deviceId" 
                  value={formData.deviceId}
                  onChange={(e) => handleChange("deviceId", e.target.value)}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create RFID Log Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Bulk Operations</CardTitle>
            <CardDescription>Create multiple RFID log entries at once</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Create Multiple Entries/Exits</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Creates 10 alternating entry/exit logs for the student specified in the form.
              </p>
              <Button 
                onClick={createMultipleEntries}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create 10 Alternating Logs"}
              </Button>
            </div>
            
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Create Logs for Multiple Students</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Creates 5-10 random logs for each of 5 different students.
              </p>
              <Button 
                onClick={createLogsForMultipleStudents}
                disabled={isLoading}
                variant="secondary"
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create Multi-Student Logs"}
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Create Logs with DormName Field</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Creates 5-10 random logs for each of 5 different students, including the dormName field.
              </p>
              <Button 
                onClick={createLogsWithDormName}
                disabled={isLoading}
                variant="secondary"
                className="w-full"
              >
                {isLoading ? "Creating..." : "Create Multi-Student Logs with DormName"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">How to test the Top 5 Tenants feature:</h3>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Use the form above to create RFID log entries for multiple students</li>
                  <li>Create more entries for some students than others to establish a clear "top 5"</li>
                  <li>Go to the Manager Dashboard and select the RFID Activity tab</li>
                  <li>You should see the Top 5 Tenants card populated with the students who have the most activity</li>
                </ol>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="font-medium">Troubleshooting:</h3>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Make sure the dormId matches the manager's assigned dormitory</li>
                  <li>Check the browser console for any error messages</li>
                  <li>Verify that the logs are being created in Firestore by checking the Firebase console</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 