"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Eye, Home, Calendar, Users, Building, Settings, Bell, LogOut, Activity, Shield } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { RfidStatusIndicator } from "@/components/rfid-status-indicator"
import { NotificationBell } from "@/components/notification-bell"

interface NavigationProps {
  userRole: "student" | "manager" | "admin"
}

interface UserInfo {
  name: string;
  email: string;
  initials: string;
  profileImageUrl: string;
}

export default function Navigation({ userRole }: NavigationProps) {
  const router = useRouter()
  const { currentUser, userData, logout } = useAuth()
  const [userInfo, setUserInfo] = useState<UserInfo>({ 
    name: "User", 
    email: "user@university.edu", 
    initials: "U",
    profileImageUrl: ""
  })

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return

      try {
        const userDocRef = doc(db, "users", currentUser.uid)
        const userDoc = await getDoc(userDocRef)
        
        if (userDoc.exists()) {
          const data = userDoc.data()
          const firstName = data.firstName || ""
          const lastName = data.lastName || ""
          const email = data.email || currentUser.email || ""
          const profileImageUrl = data.profileImageUrl || ""
          
          setUserInfo({
            name: `${firstName} ${lastName}`.trim() || "User",
            email: email,
            initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "U",
            profileImageUrl: profileImageUrl
          })
        }
      } catch (error) {
        console.error("Error fetching user data for navigation:", error)
      }
    }

    fetchUserData()
  }, [currentUser])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  const getNavItems = () => {
    switch (userRole) {
      case "student":
        return [
          { href: "/student/reservations", label: "My Reservations", icon: Calendar },
          { href: "/student/book", label: "Book Room", icon: Building },
        ]
      case "manager":
        return [
          { href: "/manager/dashboard", label: "Dashboard", icon: Home },
          { href: "/manager/approvals", label: "Approvals", icon: Calendar },
         
          { href: "/manager/my-dorm", label: "My Dormitory", icon: Building },
          { href: "/manager/logs", label: "RFID Logs", icon: Activity },
        ]
      case "admin":
        return [
          { href: "/admin/dashboard", label: "Dashboard", icon: Home },
          { href: "/admin/users", label: "User Management", icon: Users },
          { href: "/admin/student", label: "Students", icon: Users },
          { href: "/admin/manager", label: "Managers", icon: Users },
          { href: "/admin/rooms", label: "Room Management", icon: Building },
          { href: "/admin/logs", label: "RFID Logs", icon: Activity },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()
  
  // Only show RFID status for admin and manager roles
  const showRfidStatus = userRole === "admin" || userRole === "manager";

  return (
    <nav className="bg-primary text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-secondary text-black p-2 rounded-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <Eye className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-white group-hover:text-secondary transition-colors">OccupEye</span>
            </Link>

            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 text-white/80 hover:text-secondary transition-colors relative group py-1"
                  >
                    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                    <span>{item.label}</span>
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="capitalize bg-secondary/20 text-white border-secondary">
              {userRole}
            </Badge>
            
            {showRfidStatus && (
              <RfidStatusIndicator size="sm" />
            )}

            <NotificationBell userRole={userRole} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-primary-600">
                  <Avatar className="h-10 w-10 border-2 border-secondary transition-all duration-200 hover:scale-110">
                    <AvatarImage 
                      src={userInfo.profileImageUrl || "/placeholder-user.jpg"} 
                      alt="User"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-secondary text-black font-semibold">
                      {userInfo.initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userInfo.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userInfo.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={`/${userRole}/profile`}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </a>
                </DropdownMenuItem>
                {userRole === "admin" && (
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>System Admin</span>
                  </DropdownMenuItem>
                )}
                {showRfidStatus && (
                  <DropdownMenuItem>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        <span>RFID Reader</span>
                      </div>
                      <RfidStatusIndicator size="sm" showControls={true} />
                    </div>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
