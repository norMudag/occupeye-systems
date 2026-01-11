"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { generateStudentId } from "@/app/utils/admin-firestore"
import { toast } from "sonner"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/AuthContext"
import Image from "next/image"
interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter()
  const tabsRef = useRef<HTMLDivElement>(null)

  // Login form state
    const { login, register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Register form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [studentId, setStudentId] = useState("STU-2024-001")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [sex, setSex] = useState("")
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
    if (tabsRef.current) {
      const loginTrigger = tabsRef.current.querySelector('[value="login"]') as HTMLElement
      if (loginTrigger) {
        loginTrigger.click()
      }
    }
  }

  
const handleKioksMode = async (email: string,password: string)=>{
  try{
    setIsLoading(true)
    const logEmail =   email.replace("kioks.mode/", "")
     console.log("Kiosk mode detected. Using email:", logEmail)
       // Authenticate with base email
     const userCredential = await login(logEmail, password)
      // Get user data from Firestore to determine role
      const userDoc = await getDoc(doc(db, "users", userCredential.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const userRole = userData.role || "student"

         switch (userRole) {
            case "manager":
            case "student": // Add this line to allow students access
              router.push("/rfid-logs")
              break
            default:
              router.push("/student/reservations")
          }
    } else {
      router.push("/student/reservations")
    }

  }catch(error){

   console.error("Login error:", error)
    toast.error("Failed to log in. Please check your credentials.")
  } finally {
    setIsLoading(false)
  }
  
  
}

  const handleLogin = async () => {
    try {
      setIsLoading(true)
       
        if (loginEmail.startsWith("kioks.mode/")) 
          {handleKioksMode(loginEmail,loginPassword)}
        
        else{ 
      const userCredential = await login(loginEmail, loginPassword)

          console.log(`UserEmail: ${loginEmail}`)
        
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
      if (!firstName || !lastName || !studentId || !registerEmail || !registerPassword || !sex ) {
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

  // Reset form when modal closes
  const handleClose = () => {
    setLoginEmail("")
    setLoginPassword("")
    setFirstName("")
    setLastName("")
    setRegisterEmail("")
    setRegisterPassword("")
    setConfirmPassword("")
    setSex("")
    setRegisterError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle className="sr-only">OccupEye Login</DialogTitle>
          <div className="flex items-center justify-center ">
            <Image
              src="/logo/Logo.png"
              alt="Logo"
              width={90}
              height={90}
              priority
            />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary">OccupEye</h2>
            <p className="text-muted-foreground text-sm">Dormitory Space Tracking & Reservation System</p>
          </div>
        </DialogHeader>

        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-primary text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Sign in to access your account</CardDescription>
          </CardHeader>
          <CardContent>
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleLogin()
                  }}
                >
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
                {registerError && <div className="bg-red-100 text-red-600 p-3 rounded-md text-sm">{registerError}</div>}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleRegister()
                  }}
                >
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
                      <option value="" disabled>
                        Select your sex
                      </option>
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
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
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
      </DialogContent>
    </Dialog>
  )
}
