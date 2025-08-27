"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Shield, Users, Calendar, Clock, MapPin, Smartphone, Badge } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/AuthContext"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { generateStudentId } from "@/app/utils/admin-firestore"
import Navbar from "@/components/ui/navbar"

export default function LoginPage() {
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
  <div className="min-h-screen bg-background">
    <Navbar />
{/* Overview of The system */}
   <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-4xl mx-auto text-center">
         
            <h1 className="font-playfair text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6">
              Online Dormitory
              <span className="text-primary block">Management System</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Revolutionizing university housing with real-time space tracking, online reservations, and RFID technology
              to ensure student safety and optimize dormitory management at MSU Marawi.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button  size="lg" className="text-lg px-8 py-6 text-white">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features for Modern Housing Management
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of dormitory management with our comprehensive suite of tools designed for students
              and administrators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Real-Time Monitoring</CardTitle>
                <CardDescription>
                  Track dormitory occupancy and space availability in real-time with instant updates and notifications.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Online Reservations</CardTitle>
                <CardDescription>
                  Students can easily check availability and reserve bed spaces online without visiting the Housing
                  Division office.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle className="text-xl">RFID Safety Tracking</CardTitle>
                <CardDescription>
                  Advanced RFID technology monitors student entry and exit times, ensuring compliance with curfew hours
                  for enhanced safety.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Administrative Dashboard</CardTitle>
                <CardDescription>
                  Comprehensive management tools for housing administrators to monitor occupancy, approve reservations,
                  and generate reports.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl">Space Optimization</CardTitle>
                <CardDescription>
                  Intelligent algorithms help identify underutilized spaces and optimize dormitory allocation for
                  maximum efficiency.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle className="text-xl">Transparent Process</CardTitle>
                <CardDescription>
                  Eliminate bias in space allocation with a fair, transparent reservation system that ensures equal
                  opportunities for all students.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Safety Assurance Section */}
      <section id="safety" className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-foreground mb-4">
                Student Safety is Our Priority
              </h2>
              <p className="text-xl text-muted-foreground">
                Advanced RFID technology ensures students return safely within curfew hours while maintaining their
                privacy and autonomy.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Curfew Compliance Monitoring</h3>
                      <p className="text-muted-foreground">
                        Automated tracking ensures students return to dormitories within designated hours for their
                        safety and security.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Clock className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Real-Time Alerts</h3>
                      <p className="text-muted-foreground">
                        Instant notifications to administrators when students don't return by curfew, enabling quick
                        response for student welfare.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Users className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Privacy Protection</h3>
                      <p className="text-muted-foreground">
                        RFID tracking focuses solely on entry/exit times while respecting student privacy and personal
                        freedom.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-playfair text-2xl font-bold mb-4">Enhanced Campus Security</h3>
                  <p className="text-muted-foreground mb-6">
                    Our RFID system has helped improve student safety compliance by tracking entry and exit patterns,
                    ensuring a secure living environment for all residents.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">24/7</div>
                      <div className="text-sm text-muted-foreground">Monitoring</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-accent">100%</div>
                      <div className="text-sm text-muted-foreground">Automated</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your Dormitory Experience?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join hundreds of students at MSU Marawi who have already experienced the convenience and safety of
              OccupEye's modern dormitory management system.
            </p>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-muted/30 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-9 item-center "> 
            
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="h-6 w-6 text-primary" />
                <span className="font-playfair text-xl font-bold">OccupEye</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Modern dormitory management system for Mindanao State University - Marawi, enhancing student safety and
                housing efficiency.
              </p>
            </div>

         

            <div >
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>Housing Management Division</p>
                <p>Mindanao State University - Marawi</p>
                <p>Marawi City, Lanao del Sur</p>
                <p className="text-primary">housing@msumain.edu.ph</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 OccupEye - MSU Marawi Housing Management Division. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  )
} 