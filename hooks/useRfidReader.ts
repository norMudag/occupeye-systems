import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

interface UseRfidReaderProps {
  onRfidScanned: (rfidValue: string) => void;
  enabled?: boolean;
  showNotifications?: boolean;
}

/**
 * Custom hook for automatic RFID card detection
 * 
 * This hook listens for keyboard inputs that resemble RFID card scans.
 * RFID card readers typically:
 * 1. Act as keyboard input devices
 * 2. Send a sequence of characters rapidly
 * 3. Usually end with an Enter key press
 * 
 * @param onRfidScanned Callback function that receives the scanned RFID value
 * @param enabled Whether the RFID reader is enabled
 * @param showNotifications Whether to show toast notifications on detection
 */
export function useRfidReader({ 
  onRfidScanned, 
  enabled = true,
  showNotifications = true
}: UseRfidReaderProps) {
  const pathname = usePathname();
  const isAllowedPath = pathname === '/manager/logs' || pathname === '/admin/logs';
  
  const [buffer, setBuffer] = useState<string>('');
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(enabled && isAllowedPath);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing'>(enabled && isAllowedPath ? 'listening' : 'idle');
  const [inputCount, setInputCount] = useState<number>(0);

  // Reset buffer if no input is detected for a period
  const resetBufferTimeout = 500; // ms
  
  // Card readers typically send inputs very fast
  const fastInputThreshold = 30; // ms
  
  // Minimum sequence length to consider it a valid card scan
  const minCardLength = 4;
  
  // RFID cards usually have a consistent format (adjust as needed)
  const isValidCardFormat = (input: string): boolean => {
    // Basic validation - can be enhanced based on your specific RFID format
    // For example, if cards are numeric only, hexadecimal only, etc.
    return input.length >= minCardLength;
  };

  // Process the RFID input when complete
  const processRfidInput = useCallback((input: string) => {
    if (input.length >= minCardLength) {
      // Remove any leading/trailing whitespace and non-printable characters
      const cleanedInput = input.trim();
      
      if (isValidCardFormat(cleanedInput)) {
        setStatus('processing');
        
        // Show notification
        if (showNotifications) {
          toast.info(`Card detected: ${cleanedInput.slice(0, 4)}...`, {
            description: "Processing RFID card...",
            duration: 2000
          });
        }
        
        // Call the provided callback with the RFID value
        onRfidScanned(cleanedInput);
        
        // Reset after processing
        setBuffer('');
        setInputCount(0);
        setStatus('listening');
        return true;
      }
    }
    return false;
  }, [onRfidScanned, showNotifications]);

  // Set up the keyboard event listener
  useEffect(() => {
    // Only enable the RFID reader on allowed paths
    if (!enabled || !isAllowedPath) {
      setIsListening(false);
      setStatus('idle');
      return;
    }

    setIsListening(true);
    setStatus('listening');
    
    // Variables to track rapid input sequences characteristic of card readers
    let inputStartTime = 0;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only process keyboard events on allowed paths
      if (!isAllowedPath) {
        return;
      }
      
      const now = Date.now();
      
      // Start tracking a new sequence if this is the first input in a while
      if (now - lastInputTime > resetBufferTimeout) {
        inputStartTime = now;
        setInputCount(1);
      } else {
        setInputCount(prev => prev + 1);
      }
      
      // Check if this is a rapid input (typical of card readers)
      const isRapidInput = now - lastInputTime < fastInputThreshold;
      setLastInputTime(now);

      // If Enter key is pressed and we have content in the buffer, process it as a potential card scan
      if (e.key === 'Enter' && buffer) {
        // Only prevent default on allowed paths
        e.preventDefault();
        if (processRfidInput(buffer)) {
          return;
        }
      }
      
      // If we have a printable character or if it's a rapid sequence
      if (e.key.length === 1) {
        // Add to the buffer
        setBuffer(prev => prev + e.key);
        
        // Automatic detection for rapid sequences that may not end with an Enter key
        // This is relevant for some types of card readers
        if (isRapidInput) {
          // Set a timeout to clear the buffer if no more input is received
          setTimeout(() => {
            setBuffer(currentBuffer => {
              const elapsed = Date.now() - lastInputTime;
              // If no additional input has been received for a while, and we have enough characters
              if (elapsed > resetBufferTimeout && currentBuffer.length >= minCardLength) {
                // Calculate input speed (characters per second)
                const duration = lastInputTime - inputStartTime;
                const charsPerSec = duration > 0 ? (currentBuffer.length * 1000 / duration) : 0;
                
                // Only process as a card if the input rate is very high (typical of card readers)
                if (charsPerSec > 10 || inputCount >= minCardLength) { // More than 10 chars per second
                  processRfidInput(currentBuffer);
                  return '';
                }
              }
              
              // If the elapsed time is significant but not long enough to reset,
              // and the buffer doesn't look like a card, just keep it
              return currentBuffer;
            });
          }, resetBufferTimeout);
        }
      }
    };

    // Add event listener
    window.addEventListener('keypress', handleKeyPress);
    
    // Clean up
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [buffer, enabled, lastInputTime, processRfidInput, inputCount, isAllowedPath]);

  // Update listening state when pathname changes
  useEffect(() => {
    if (enabled && isAllowedPath) {
      setIsListening(true);
      setStatus('listening');
    } else {
      setIsListening(false);
      setStatus('idle');
    }
  }, [enabled, isAllowedPath]);

  // Method to manually toggle listening state
  const toggleListening = useCallback(() => {
    // Only allow toggling on permitted pages
    if (!isAllowedPath) {
      if (showNotifications) {
        toast.error("RFID reader can only be enabled on allowed pages", {
          description: "Navigate to manager/logs or admin/logs to use the RFID reader",
        });
      }
      return;
    }
    
    setIsListening(prev => !prev);
    setStatus(prev => prev === 'idle' ? 'listening' : 'idle');
    setBuffer(''); // Clear buffer when toggling
    
    if (showNotifications) {
      toast(isListening ? "RFID reader disabled" : "RFID reader enabled", {
        description: isListening ? "Manual input required" : "Ready to scan cards automatically",
      });
    }
  }, [isListening, showNotifications, isAllowedPath]);
  
  // Method to manually clear the buffer
  const clearBuffer = useCallback(() => {
    setBuffer('');
    setInputCount(0);
  }, []);

  return {
    isListening,
    status,
    toggleListening,
    currentBuffer: buffer,
    clearBuffer
  };
}

export default useRfidReader; 