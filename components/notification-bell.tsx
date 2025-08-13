"use client";

import React from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/lib/NotificationContext';

interface NotificationBellProps {
  userRole: "student" | "manager" | "admin";
}

export function NotificationBell({ userRole }: NotificationBellProps) {
  const { unreadCount, isLoading } = useNotifications();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-white hover:text-secondary hover:bg-primary-600 rounded-full w-10 h-10 flex items-center justify-center"
      asChild
    >
      <Link href={`/${userRole}/notifications`}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary text-black rounded-full font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
} 