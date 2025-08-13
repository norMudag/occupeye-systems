"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUnreadNotificationCount } from '@/app/utils/notification-service';
import { useAuth } from '@/lib/AuthContext';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  isLoading: false
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, userData } = useAuth();

  const fetchUnreadCount = async () => {
    if (!currentUser || !userData) return;
    
    try {
      setIsLoading(true);
      const isStudent = userData.role === 'student';
      const count = await getUnreadNotificationCount(currentUser.uid, isStudent);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread count when user data changes
  useEffect(() => {
    fetchUnreadCount();
  }, [currentUser, userData]);

  // Set up an interval to refresh the count every minute
  useEffect(() => {
    if (!currentUser) return;
    
    const intervalId = setInterval(() => {
      fetchUnreadCount();
    }, 60000); // 1 minute
    
    return () => clearInterval(intervalId);
  }, [currentUser]);

  const refreshUnreadCount = async () => {
    await fetchUnreadCount();
  };

  const value = {
    unreadCount,
    refreshUnreadCount,
    isLoading
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
} 