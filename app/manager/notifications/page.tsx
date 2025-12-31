"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, CheckCircle, Clock, AlertCircle, Trash2, BookMarkedIcon as MarkAsUnread, Users } from "lucide-react"
import Navigation from "@/components/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getAuth } from "firebase/auth"
import { ManagerNotification, getManagerNotifications, markNotificationAsRead, markNotificationAsUnread, deleteNotification, markAllNotificationsAsRead } from "@/app/utils/notification-firestore"
import { useNotifications } from "@/lib/NotificationContext"

export default function ManagerNotifications() {
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
  const approvalNotifications = notifications.filter((n) => n.type === "approval")

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="manager" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Manager Notifications</h1>
              <p className="text-gray-600 mt-2">Stay updated with reservation requests and system alerts</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-primary text-white">{unreadCount} unread</Badge>
              <Button
                onClick={handleMarkAllAsRead}
                variant="outline"
                className="border-secondary/20 text-primary hover:bg-secondary/10"
                disabled={unreadCount === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
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
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                All Notifications ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="approvals" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Approval Requests ({approvalNotifications.length})
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
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold ${!notification.read ? "text-primary" : "text-gray-900"}`}>
                              {notification.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                              {!notification.read && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-3">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{notification.timestamp}</span>
                            <div className="flex space-x-2">
                              {notification.read ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsUnread(notification.id)}
                                  className="text-gray-500 hover:text-primary"
                                >
                                  <MarkAsUnread className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-gray-500 hover:text-primary"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-gray-500 hover:text-warning"
                              >
                                <Trash2 className="h-4 w-4" />
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-gray-600">No unread notifications.</p>
                  </CardContent>
                </Card>
              ) : (
                unreadNotifications.map((notification) => (
                  <Card key={notification.id} className="border-primary/20 bg-primary/5 transition-all hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-primary">{notification.title}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            </div>
                          </div>
                          <p className="text-gray-600 mb-3">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{notification.timestamp}</span>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-gray-500 hover:text-primary"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-gray-500 hover:text-warning"
                              >
                                <Trash2 className="h-4 w-4" />
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

            <TabsContent value="approvals" className="space-y-4">
              {approvalNotifications.length === 0 ? (
                <Card className="border-secondary/20">
                  <CardContent className="text-center py-12">
                    <Clock className="h-12 w-12 text-warning mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No approval requests</h3>
                    <p className="text-gray-600">You have no pending approval requests.</p>
                  </CardContent>
                </Card>
              ) : (
                approvalNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`border-warning/20 transition-all hover:shadow-md ${
                      !notification.read ? "bg-warning/5" : ""
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold ${!notification.read ? "text-primary" : "text-gray-900"}`}>
                              {notification.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                              {!notification.read && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-3">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">{notification.timestamp}</span>
                            <div className="flex space-x-2">
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" asChild>
                                <a href="/manager/approvals">Review Request</a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                                className="text-gray-500 hover:text-primary"
                              >
                                <CheckCircle className="h-4 w-4" />
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
      </main>
    </div>
  )
}
