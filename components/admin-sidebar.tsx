"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Users, 
  Building, 
  Activity, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Settings,
  LogOut,
  Bell
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/AuthContext"
import { RfidStatusIndicator } from "@/components/rfid-status-indicator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/lib/NotificationContext"

interface SidebarProps {
  className?: string
}

interface UserInfo {
  name: string;
  email: string;
  initials: string;
  profileImageUrl: string;
}

export function AdminSidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { currentUser, userData, logout } = useAuth()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo>({ 
    name: "Admin", 
    email: "admin@university.edu", 
    initials: "A",
    profileImageUrl: ""
  })
  const { unreadCount } = useNotifications();

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
            name: `${firstName} ${lastName}`.trim() || "Admin",
            email: email,
            initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "A",
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

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: Home },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/dorms", label: "Dorm Management", icon: Building },
    { href: "/admin/logs", label: "RFID Logs", icon: Activity },
    { href: "/admin/notifications", label: "Notifications", icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
  ]

  return (
    <div className={cn(
      "flex flex-col h-screen bg-primary text-white transition-all duration-300 border-r border-primary-800",
      collapsed ? "w-20" : "w-64",
      className
    )}>
      {/* Logo and collapse button */}
      <div className="flex items-center justify-between p-3 border-b border-primary-800">
        <Link href="/admin/dashboard" className={cn(
          "flex items-center space-x-2",
          collapsed && "justify-center"
        )}>
          <div className="bg-secondary text-black p-1.5 rounded-lg">
            <Eye className="h-5 w-5" />
          </div>
          {!collapsed && <span className="text-lg font-bold">OccupEye</span>}
        </Link>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-primary-700"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* User profile */}
      <div className={cn(
        "flex items-center p-3 border-b border-primary-800",
        collapsed ? "justify-center" : "space-x-3"
      )}>
        <Avatar className="h-8 w-8 border-2 border-secondary">
          <AvatarImage 
            src={userInfo.profileImageUrl || "/placeholder-user.jpg"} 
            alt="Admin"
            className="object-cover"
          />
          <AvatarFallback className="bg-secondary text-black font-semibold text-xs">
            {userInfo.initials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-medium text-xs">{userInfo.name}</span>
            <span className="text-xs text-gray-300">Administrator</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-2 py-2 rounded-md transition-colors text-xs",
                  isActive 
                    ? "bg-secondary text-primary font-medium" 
                    : "text-white/80 hover:text-white hover:bg-primary-700",
                  collapsed ? "justify-center" : "space-x-2"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-inherit")} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center p-0 text-[8px] bg-secondary text-black rounded-full font-medium">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="bg-secondary text-black rounded-full text-[8px] px-1.5 py-0.5 min-w-[16px] text-center">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* RFID Status and Settings */}
      <div className="p-3 border-t border-primary-800">
        <div className={cn(
          "flex items-center mb-3",
          collapsed ? "justify-center" : "space-x-2"
        )}>
          <RfidStatusIndicator size={collapsed ? "sm" : "sm"} showControls={!collapsed} />
          {!collapsed && <span className="text-xs">RFID Reader</span>}
        </div>
        
        <div className={cn(
          "flex items-center mb-3",
          collapsed ? "justify-center" : "space-x-2"
        )}>
          <Link
            href="/admin/profile"
            className={cn(
              "flex items-center px-2 py-1.5 rounded-md transition-colors text-white/80 hover:text-white hover:bg-primary-700 text-xs",
              collapsed ? "justify-center w-full" : "space-x-2"
            )}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "flex items-center px-2 py-1.5 rounded-md transition-colors text-white/80 hover:text-red-400 hover:bg-primary-700 w-full text-xs",
            collapsed ? "justify-center" : "space-x-2"
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
} 