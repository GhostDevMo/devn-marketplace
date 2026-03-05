
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if we're running in a mobile environment (Capacitor)
        const isCapacitor = window.location.protocol === 'capacitor:' || 
                           (window.location.hostname === 'localhost' && window.navigator.userAgent.includes('Mobile'));
        
        if (isCapacitor && (window as any).Capacitor) {
          // Capacitor Network functionality would be handled here
          // when the app is built for mobile platforms
          console.log('Capacitor Network API would be used here');
        } else {
          // Web fallback using navigator.onLine
          const updateOnlineStatus = () => {
            setIsConnected(navigator.onLine);
            setConnectionType(navigator.onLine ? 'wifi' : 'none');
          };

          updateOnlineStatus();

          window.addEventListener('online', updateOnlineStatus);
          window.addEventListener('offline', updateOnlineStatus);

          return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
          };
        }
      } catch (error) {
        console.log('Network status initialization error:', error);
        // Fallback to web API
        const updateOnlineStatus = () => {
          setIsConnected(navigator.onLine);
          setConnectionType(navigator.onLine ? 'wifi' : 'none');
        };

        updateOnlineStatus();

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
          window.removeEventListener('online', updateOnlineStatus);
          window.removeEventListener('offline', updateOnlineStatus);
        };
      }
    };

    let cleanup: (() => void) | undefined;
    checkStatus().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return { isConnected, connectionType };
}
