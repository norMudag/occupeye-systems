"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Shield, Users, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { generateStudentId } from "@/app/utils/admin-firestore"

export default function Examples() {
  const router = useRouter()
  const { login, register } = useAuth()
  const tabsRef = useRef<HTMLDivElement>(null)
  
  // Login form state
  const [isLoading, setIsLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginModalOpen, setloginModalOpen] = useState(false)
  // Register form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sex, setSex] = useState("") // Add sex state
  const [registerError, setRegisterError] = useState("")
  const [generatingId, setGeneratingId] = useState(false)

  // Generate student ID when page loads
  useEffect(() => {
    const generateId = async () => {
      try {
        setGeneratingId(true)
        const newStudentId = await generateStudentId()
        setStudentId(newStudentId)
      } catch (error) {
        console.error("Error generating student ID:", error)
      } finally {
        setGeneratingId(false)
      }
    }
    
    generateId()
  }, [])

  // Function to switch to login tab programmatically
  const switchToLoginTab = () => {
    // Find the login trigger element and click it
    if (tabsRef.current) {
      const loginTrigger = tabsRef.current.querySelector('[value="login"]') as HTMLElement
      if (loginTrigger) {
        loginTrigger.click()
      }
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      const userCredential = await login(loginEmail, loginPassword)
      
      // Get user data from Firestore to determine role
      const userDoc = await getDoc(doc(db, "users", userCredential.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const userRole = userData.role || "student"
        
        // Direct user to appropriate dashboard based on role from Firestore
        switch (userRole) {
          case "student":
            router.push("/student/reservations")
            break
          case "admin":
            router.push("/admin/dashboard")
            break
          case "manager":
            router.push("/manager/dashboard")
            break
          default:
            router.push("/student/reservations")
        }
      } else {
        // If no user data in Firestore, default to student reservations
        router.push("/student/reservations")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Failed to log in. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }



  
  const handleRegister = async () => {
    try {
      // Validate fields
      if (!firstName || !lastName || !studentId || !registerEmail || !registerPassword || !sex) {
        setRegisterError("All fields are required")
        return
      }
      
      if (registerPassword !== confirmPassword) {
        setRegisterError("Passwords do not match")
        return
      }
      
      setIsLoading(true)
      setRegisterError("")
      
      // Register the user with Firebase Authentication
      const userCredential = await register(registerEmail, registerPassword)
      
      // Store additional user information in Firestore with default role "student"
      await setDoc(doc(db, "users", userCredential.uid), {
        firstName,
        lastName,
        studentId,
        email: registerEmail,
        sex, // Add sex field
        role: "student", // Default role is student
        status: "active",
        academicStatus: "N/A",
        createdAt: new Date().toISOString()
      })
      
      toast.success("Account created successfully! Please log in.")
      
      // Clear form fields
      setFirstName("")
      setLastName("")
      setSex("") // Reset sex field
      
      // Generate a new student ID
      try {
        setGeneratingId(true)
        const newStudentId = await generateStudentId()
        setStudentId(newStudentId)
      } catch (error) {
        console.error("Error generating new student ID:", error)
        setStudentId("")
      } finally {
        setGeneratingId(false)
      }
      
      setRegisterEmail("")
      setRegisterPassword("")
      setConfirmPassword("")
      
      // Switch to the login tab
      switchToLoginTab()
    } catch (error) {
      console.error("Registration error:", error)
      setRegisterError("Failed to register. Email may be already in use.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <Eye className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary">OccupEye</h1>
          <p className="text-gray-600 mt-2">Dormitory Space Tracking & Reservation System</p>
        </div>
          <Card className="border-secondary/20">
            <CardHeader className="border-b border-secondary/20">
              <CardTitle className="text-primary">Welcome Back</CardTitle>
              <CardDescription>Sign in to access your account</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="login" className="space-y-4" ref={tabsRef}>
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  {registerError && (
                    <div className="bg-red-100 text-red-600 p-3 rounded-md text-sm">{registerError}</div>
                  )}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleRegister();
                  }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          placeholder="John" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          placeholder="Doe" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sex">Sex</Label>
                      <select 
                        id="sex" 
                        value={sex} 
                        onChange={(e) => setSex(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="" disabled>Select your sex</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="registerEmail">Email</Label>
                      <Input 
                        id="registerEmail" 
                        type="email" 
                        value={registerEmail} 
                        onChange={(e) => setRegisterEmail(e.target.value)} 
                        placeholder="john.doe@university.edu" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="registerPassword">Password</Label>
                      <Input 
                        id="registerPassword" 
                        type="password" 
                        value={registerPassword} 
                        onChange={(e) => setRegisterPassword(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                      disabled={isLoading || generatingId}
                    >
                      {isLoading ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        
        {/* <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-600">
          <div className="flex flex-col items-center space-y-2">
            <Users className="h-6 w-6 text-primary" />
            <span>Real-time Tracking</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span>Easy Reservations</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <Shield className="h-6 w-6 text-primary" />
            <span>Secure Access</span>
          </div>
        </div> */}
      </div>
    </div>
  )
} 