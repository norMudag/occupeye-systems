"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scan, CreditCard } from "lucide-react";
import { useRfidService } from "@/lib/RfidService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RfidStatusIndicatorProps {
  showControls?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RfidStatusIndicator({ 
  showControls = false,
  size = "md" 
}: RfidStatusIndicatorProps) {
  const { 
    isListening, 
    status: rfidReaderStatus, 
    toggleListening, 
    currentBuffer 
  } = useRfidService();
  
  const [showPulse, setShowPulse] = useState(false);
  
  // Show pulse animation when buffer changes
  useEffect(() => {
    if (currentBuffer.length > 0) {
      setShowPulse(true);
      const timer = setTimeout(() => setShowPulse(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [currentBuffer]);
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };
  
  const buttonSizeClasses = {
    sm: "h-6 px-2 text-xs",
    md: "h-8 px-3 text-sm",
    lg: "h-10 px-4"
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {rfidReaderStatus === 'idle' ? (
                <CreditCard className={`${sizeClasses[size]} text-gray-400`} />
              ) : (
                <Scan className={`${sizeClasses[size]} text-primary ${showPulse ? 'animate-pulse' : ''}`} />
              )}
              
              {size !== "sm" && (
                <Badge className={`${rfidReaderStatus !== 'idle' ? "bg-success" : "bg-muted"} text-white`}>
                  {rfidReaderStatus === 'idle' ? 'OFF' : rfidReaderStatus === 'processing' ? 'Processing' : 'Listening'}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>RFID Reader: {isListening ? "Active" : "Inactive"}</p>
            {currentBuffer.length > 0 && (
              <p className="text-xs mt-1">Detecting: {currentBuffer.length} characters</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showControls && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleListening}
          className={`${buttonSizeClasses[size]} text-black`}
        >
          {isListening ? "Disable" : "Enable"} Reader
        </Button>
      )}
    </div>
  );
} 