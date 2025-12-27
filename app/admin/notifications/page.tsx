"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, CheckCircle, Clock, AlertCircle, Trash2, BookMarkedIcon as MarkAsUnread, Users, Building, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { getAuth } from "firebase/auth"
import { ManagerNotification, getManagerNotifications, markNotificationAsRead, markNotificationAsUnread, deleteNotification, markAllNotificationsAsRead } from "@/app/utils/notification-firestore"
import { useNotifications } from "@/lib/NotificationContext"

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<ManagerNotification[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const auth = getAuth()
  const { refreshUnreadCount } = useNotifications()

  // Fetch notifications from Firestore
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view your notifications.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      try {
        const fetchedNotifications = await getManagerNotifications(auth.currentUser.uid)
        setNotifications(fetchedNotifications)
      } catch (error) {
        console.error("Error fetching notifications:", error)
        toast({
          title: "Error",
          description: "Failed to fetch notifications. Please try again later.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [auth, toast])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "approval":
        return <Clock className="h-5 w-5 text-warning" />
      case "occupancy":
        return <Users className="h-5 w-5 text-primary" />
      case "system":
        return <AlertCircle className="h-5 w-5 text-secondary" />
      case "announcement":
        return <Bell className="h-5 w-5 text-success" />
      default:
        return <Bell className="h-5 w-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-warning text-white"
      case "normal":
        return "bg-secondary text-black"
      default:
        return "bg-gray-200 text-gray-800"
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const success = await markNotificationAsRead(id, false)
      
      if (success) {
        setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif)))
        refreshUnreadCount()
      } else {
        toast({
          title: "Error",
          description: "Failed to mark notification as read.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const markAsUnread = async (id: string) => {
    try {
      const success = await markNotificationAsUnread(id, false)
      
      if (success) {
        setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, read: false } : notif)))
        refreshUnreadCount()
      } else {
        toast({
          title: "Error",
          description: "Failed to mark notification as unread.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking notification as unread:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNotification = async (id: string) => {
    try {
      const success = await deleteNotification(id, false)
      
      if (success) {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id))
        refreshUnreadCount()
        toast({
          title: "Success",
          description: "Notification deleted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete notification.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      if (!auth.currentUser) return

      const success = await markAllNotificationsAsRead(auth.currentUser.uid, false)
      
      if (success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
        refreshUnreadCount()
        toast({
          title: "Success",
          description: "All notifications marked as read.",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to mark all notifications as read.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const allNotifications = notifications
  const unreadNotifications = notifications.filter((n) => !n.read)
  const systemNotifications = notifications.filter((n) => n.type === "system")

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">System Notifications</h1>
            <p className="text-gray-600 text-xs">Stay updated with system alerts and important information</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-primary text-white">{unreadCount} unread</Badge>
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              className="border-secondary/20 text-primary hover:bg-secondary/10 text-xs h-8"
              disabled={unreadCount === 0}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Mark All Read
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <p className="text-primary">Loading notifications...</p>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-muted border border-secondary/20">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
              All Notifications ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs">
              System ({systemNotifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {allNotifications.length === 0 ? (
              <Card className="border-secondary/20">
                <CardContent className="text-center py-12">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              allNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-secondary/20 transition-all hover:shadow-md ${
                    !notification.read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium text-sm ${!notification.read ? "text-primary" : ""}`}>
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{notification.timestamp}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => (notification.read ? markAsUnread(notification.id) : markAsRead(notification.id))}
                            >
                              {notification.read ? <MarkAsUnread className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-warning hover:text-warning"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {unreadNotifications.length === 0 ? (
              <Card className="border-secondary/20">
                <CardContent className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No unread notifications</h3>
                  <p className="text-gray-600">You've read all your notifications</p>
                </CardContent>
              </Card>
            ) : (
              unreadNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="border-secondary/20 bg-primary/5 border-primary/20 transition-all hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-sm text-primary">
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">
                            {notification.type}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{notification.timestamp}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-warning hover:text-warning"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            {systemNotifications.length === 0 ? (
              <Card className="border-secondary/20">
                <CardContent className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No system notifications</h3>
                  <p className="text-gray-600">No system alerts at this time</p>
                </CardContent>
              </Card>
            ) : (
              systemNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-secondary/20 transition-all hover:shadow-md ${
                    !notification.read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <AlertCircle className="h-5 w-5 text-secondary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className={`font-medium text-sm ${!notification.read ? "text-primary" : ""}`}>
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-gray-600 text-xs mb-3">{notification.message}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500">{notification.timestamp}</span>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => (notification.read ? markAsUnread(notification.id) : markAsRead(notification.id))}
                            >
                              {notification.read ? <MarkAsUnread className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-warning hover:text-warning"
                              onClick={() => handleDeleteNotification(notification.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
} 