"use client";

//cant read "RFID" in kiosk mode

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import useRfidReader from '@/hooks/useRfidReader';
import { usePathname } from 'next/navigation';

interface RfidServiceContextType {
  isListening: boolean;
  status: 'idle' | 'listening' | 'processing';
  currentBuffer: string;
  toggleListening: () => void;
  clearBuffer: () => void;
  lastScannedRfid: string | null;
  lastScanResult: {
    success: boolean;
    user?: any;
    logEntry?: any;
    error?: string;
  } | null;
}

const RfidServiceContext = createContext<RfidServiceContextType | undefined>(undefined);

export const useRfidService = () => {
  const context = useContext(RfidServiceContext);
  if (!context) {
    throw new Error('useRfidService must be used within an RfidServiceProvider');
  }
  return context;
};

interface RfidServiceProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const RfidServiceProvider = ({ children, enabled = true }: RfidServiceProviderProps) => {
  const pathname = usePathname();
  const isAllowedPath = pathname === '/manager/logs' || pathname === '/admin/logs' || pathname === '/rfid-logs';
  
  const [autoDetectionEnabled, setAutoDetectionEnabled] = useState<boolean>(enabled && isAllowedPath);
  const [lastScannedRfid, setLastScannedRfid] = useState<string | null>(null);
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    user?: any;
    logEntry?: any;
    error?: string;
  } | null>(null);

  // Handle RFID card processing
  const handleRfidDetected = async (rfidValue: string) => {
    try {
      setLastScannedRfid(rfidValue);
      
      // Call the API endpoint to process the RFID reading
      const response = await fetch('/api/rfid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rfidValue: rfidValue.trim(),
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error || "Failed to process RFID card");
        setLastScanResult({
          success: false,
          error: data.error || "Failed to process RFID card"
        });
        return;
      }
      
      // Display success message with user info
      if (data.success) {
        toast.success(`Access ${data.logEntry.action} for ${data.user.firstName} ${data.user.lastName}`);
        setLastScanResult({
          success: true,
          user: data.user,
          logEntry: data.logEntry
        });
      } else {
        toast.error("Access denied");
        setLastScanResult({
          success: false,
          error: "Access denied"
        });
      }
    } catch (error) {
      console.error("Error processing RFID:", error);
      toast.error("Failed to process RFID card");
      setLastScanResult({
        success: false,
        error: "Failed to process RFID card"
      });
    }
  };

  // Set up automatic RFID detection
  const { 
    isListening, 
    status, 
    toggleListening: toggleReaderListening, 
    currentBuffer, 
    clearBuffer 
  } = useRfidReader({
    onRfidScanned: handleRfidDetected,
    enabled: autoDetectionEnabled && isAllowedPath,
    showNotifications: true
  });

  // Update enabled state when path changes
  useEffect(() => {
    setAutoDetectionEnabled(enabled && isAllowedPath);
  }, [enabled, isAllowedPath]);

  // Toggle listening state
  const toggleListening = () => {
    if (!isAllowedPath) {
      toast.error("RFID reader can only be enabled on allowed pages", {
        description: "Navigate to manager/logs or admin/logs to use the RFID reader",
      });
      return;
    }
    
    setAutoDetectionEnabled(!autoDetectionEnabled);
    toggleReaderListening();
  };

  // Provide the RFID service context
  const contextValue: RfidServiceContextType = {
    isListening,
    status,
    currentBuffer,
    toggleListening,
    clearBuffer,
    lastScannedRfid,
    lastScanResult
  };

  return (
    <RfidServiceContext.Provider value={contextValue}>
      {children}
    </RfidServiceContext.Provider>
  );
};

export default RfidServiceProvider; 