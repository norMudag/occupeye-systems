"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, CheckCircle, Clock, AlertCircle, Trash2, BookMarkedIcon as MarkAsUnread } from "lucide-react"
import Navigation from "@/components/navigation"
import { useToast } from "@/components/ui/use-toast"
import { getAuth } from "firebase/auth"
import { 
  StudentNotification, 
  getStudentNotifications, 
  markNotificationAsRead,
  markNotificationAsUnread,
  deleteNotification,
  markAllNotificationsAsRead
} from "@/app/utils/notification-firestore"
import { useNotifications } from "@/lib/NotificationContext"

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([])
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
        const fetchedNotifications = await getStudentNotifications(auth.currentUser.uid)
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

  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)

  const markAsRead = async (id: string) => {
    try {
      const success = await markNotificationAsRead(id, true)
      
      if (success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
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
      const success = await markNotificationAsUnread(id, true)
      
      if (success) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
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
      const success = await deleteNotification(id, true)
      
      if (success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
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

      const success = await markAllNotificationsAsRead(auth.currentUser.uid, true)
      
      if (success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-success" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-warning" />
      case "info":
        return <Clock className="h-5 w-5 text-primary" />
      default:
        return <Bell className="h-5 w-5 text-primary" />
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case "success":
        return "bg-success text-white"
      case "warning":
        return "bg-warning text-white"
      case "info":
        return "bg-primary text-white"
      default:
        return "bg-secondary text-black"
    }
  }

  const NotificationCard = ({ notification, showActions = true }: { notification: StudentNotification; showActions?: boolean }) => (
    <Card className={`border-secondary/20 ${!notification.read ? "bg-secondary/5" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getNotificationIcon(notification.type)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`font-semibold ${!notification.read ? "text-primary" : "text-gray-900"}`}>
                {notification.title}
              </h3>
              <div className="flex items-center space-x-2">
                {!notification.read && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                <Badge className={getNotificationBadge(notification.type)}>{notification.type}</Badge>
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-3">{notification.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{notification.timestamp}</span>
              {showActions && (
                <div className="flex items-center space-x-2">
                  {notification.action && (
                    <Button size="sm" variant="outline" className="text-xs">
                      {notification.action}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (notification.read ? markAsUnread(notification.id) : markAsRead(notification.id))}
                  >
                    {notification.read ? <MarkAsUnread className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="text-warning hover:text-warning"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="student" />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Notifications</h1>
          <p className="text-gray-600 mt-2">Stay updated with your reservations and system announcements</p>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <p className="text-primary">Loading notifications...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="border-secondary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Unread</CardTitle>
                  <Bell className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{unreadNotifications.length}</div>
                  <p className="text-xs text-muted-foreground">New notifications</p>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">Total</CardTitle>
                  <CheckCircle className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{notifications.length}</div>
                  <p className="text-xs text-muted-foreground">All notifications</p>
                </CardContent>
              </Card>

              <Card className="border-secondary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">This Week</CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {notifications.filter(n => {
                      const oneWeekAgo = new Date();
                      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                      const notificationDate = new Date(n.timestamp);
                      return notificationDate >= oneWeekAgo;
                    }).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Recent notifications</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="unread" className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="bg-muted border border-secondary/20">
                  <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    Unread ({unreadNotifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    All Notifications
                  </TabsTrigger>
                  <TabsTrigger value="read" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    Read ({readNotifications.length})
                  </TabsTrigger>
                </TabsList>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="border-secondary/20"
                    disabled={unreadNotifications.length === 0}
                  >
                    Mark All as Read
                  </Button>
                </div>
              </div>

              <TabsContent value="unread" className="space-y-4">
                {unreadNotifications.length === 0 ? (
                  <Card className="border-secondary/20">
                    <CardContent className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">All caught up!</h3>
                      <p className="text-gray-600">You have no unread notifications.</p>
                    </CardContent>
                  </Card>
                ) : (
                  unreadNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {notifications.length === 0 ? (
                  <Card className="border-secondary/20">
                    <CardContent className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">No notifications</h3>
                      <p className="text-gray-600">You don't have any notifications yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  notifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="read" className="space-y-4">
                {readNotifications.length === 0 ? (
                  <Card className="border-secondary/20">
                    <CardContent className="text-center py-8">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">No read notifications</h3>
                      <p className="text-gray-600">Your read notifications will appear here.</p>
                    </CardContent>
                  </Card>
                ) : (
                  readNotifications.map((notification) => (
                    <NotificationCard key={notification.id} notification={notification} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}
